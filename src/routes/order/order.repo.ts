import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from 'src/generated/prisma/client';
import {
  CannotCancelOrderException,
  NotFoundCartItemException,
  OrderNotFoundException,
  ProductNotBelongToShopException,
  ProductNotFoundException,
} from 'src/routes/order/order.error';
import {
  CancelOrderResType,
  CreateOrderBodyType,
  CreateOrderResType,
  GetManageOrdersQueryType,
  GetManageOrdersResType,
  GetOrderDetailResType,
  GetOrderListQueryType,
  GetOrderListResType,
} from 'src/routes/order/order.model';
// import { OrderProducer } from 'src/routes/order/order.producer';
import { PaymentStatus } from 'src/shared/constants/payment.constant';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { isNotFoundPrismaError } from 'src/shared/helpers';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class OrderRepo {
  constructor(
    private readonly prismaService: PrismaService,
    // private orderProducer: OrderProducer,
  ) {}
  async list(userId: number, query: GetOrderListQueryType): Promise<GetOrderListResType> {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.OrderWhereInput = {
      userId,
      status,
    };

    // Đếm tổng số order
    const totalItem$ = this.prismaService.order.count({
      where,
    });
    // Lấy list order
    const data$ = this.prismaService.order.findMany({
      where,
      include: {
        items: true,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
    const [data, totalItems] = await Promise.all([data$, totalItem$]);
    return {
      data: data as any,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  async create(
    userId: number,
    body: CreateOrderBodyType,
  ): Promise<{
    paymentId: number;
    orders: CreateOrderResType['orders'];
  }> {
    // 1. Kiểm tra xem tất cả cartItemIds có tồn tại trong cơ sở dữ liệu hay không
    // 2. Kiểm tra xem tất cả sản phẩm mua có sản phẩm nào bị xóa hay ẩn không
    // 3. Kiểm tra xem các productId trong cartItem gửi lên có thuộc về shopId gửi lên không
    // 4. Tạo order
    // 5. Xóa cartItem
    const allBodyCartItemIds = body.map((item) => item.cartItemIds).flat();

    const [paymentId, orders] = await this.prismaService.$transaction<[number, CreateOrderResType['orders']]>(
      async (tx) => {
        const cartItems = await tx.cartItem.findMany({
          where: {
            id: {
              in: allBodyCartItemIds,
            },
            userId,
          },
          include: {
            product: {
              include: {
                productTranslations: true,
              },
            },
          },
        });

        // 1. Kiểm tra xem tất cả cartItemIds có tồn tại trong cơ sở dữ liệu hay không
        if (cartItems.length !== allBodyCartItemIds.length) {
          throw NotFoundCartItemException;
        }

        // 2. Kiểm tra xem tất cả sản phẩm mua có sản phẩm nào bị xóa hay ẩn không
        const isExistNotReadyProduct = cartItems.some(
          (item) =>
            item.product.deletedAt !== null ||
            item.product.publishedAt === null ||
            item.product.publishedAt > new Date(),
        );
        if (isExistNotReadyProduct) {
          throw ProductNotFoundException;
        }

        // 3. Kiểm tra xem các productId trong cartItem gửi lên có thuộc về shopId gửi lên không
        const cartItemMap = new Map<number, (typeof cartItems)[0]>();
        cartItems.forEach((item) => {
          cartItemMap.set(item.id, item);
        });
        const isValidShop = body.every((item) => {
          const bodyCartItemIds = item.cartItemIds;
          return bodyCartItemIds.every((cartItemId) => {
            // Neu đã đến bước này thì cartItem luôn luôn có giá trị
            // Vì chúng ta đã so sánh với allBodyCartItems.length ở trên rồi
            const cartItem = cartItemMap.get(cartItemId)!;
            return item.shopId === cartItem.product.createdById;
          });
        });
        if (!isValidShop) {
          throw ProductNotBelongToShopException;
        }

        // 4. Tạo order và xóa cartItem trong transaction để đảm bảo tính toàn vẹn dữ liệu

        const payment = await tx.payment.create({
          data: {
            status: PaymentStatus.PENDING,
          },
        });
        const orders: CreateOrderResType['orders'] = [];
        for (const item of body) {
          const order = await tx.order.create({
            data: {
              userId,
              status: OrderStatus.PENDING_PAYMENT,
              receiver: item.receiver,
              createdById: userId,
              shopId: item.shopId,
              paymentId: payment.id,
              items: {
                create: item.cartItemIds.map((cartItemId) => {
                  const cartItem = cartItemMap.get(cartItemId)!;
                  return {
                    productName: cartItem.product.name,
                    price: cartItem.product.basePrice,
                    image: cartItem.product.images[0] ?? '',
                    quantity: cartItem.quantity,
                    productId: cartItem.product.id,
                    productTranslations: cartItem.product.productTranslations.map((translation) => {
                      return {
                        id: translation.id,
                        name: translation.name,
                        description: translation.description,
                        languageId: translation.languageId,
                      };
                    }),
                  };
                }),
              },
              products: {
                connect: item.cartItemIds.map((cartItemId) => {
                  const cartItem = cartItemMap.get(cartItemId)!;
                  return {
                    id: cartItem.product.id,
                  };
                }),
              },
            },
          });
          orders.push(order as any);
        }

        await tx.cartItem.deleteMany({
          where: {
            id: {
              in: allBodyCartItemIds,
            },
          },
        });
        // await this.orderProducer.addCancelPaymentJob(payment.id);
        return [payment.id, orders];
      },
    );

    return {
      paymentId,
      orders,
    };
  }

  /**
   * Dành cho Admin - list toàn bộ đơn hàng của mọi user/shop
   */
  async listAll(query: GetManageOrdersQueryType): Promise<GetManageOrdersResType> {
    const { page, limit, status, userId, shopId } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.OrderWhereInput = {
      status,
      userId,
      shopId,
      deletedAt: null,
    };

    const [totalItems, data] = await Promise.all([
      this.prismaService.order.count({ where }),
      this.prismaService.order.findMany({
        where,
        include: {
          items: true,
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: data as any,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /**
   * Dành cho Admin - cập nhật trạng thái đơn hàng thủ công, không giới hạn theo userId
   */
  async updateStatus(orderId: number, status: OrderStatus, updatedById: number): Promise<CancelOrderResType> {
    try {
      const updatedOrder = await this.prismaService.order.update({
        where: {
          id: orderId,
          deletedAt: null,
        },
        data: {
          status,
          updatedById,
        },
      });
      return updatedOrder as any;
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw OrderNotFoundException;
      }
      throw error;
    }
  }

  async detail(userId: number, orderid: number): Promise<GetOrderDetailResType> {
    const order = await this.prismaService.order.findUnique({
      where: {
        id: orderid,
        userId,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });
    if (!order) {
      throw OrderNotFoundException;
    }
    return order as any;
  }

  /**
   * Dành cho Admin - xem chi tiết bất kỳ đơn hàng nào, không giới hạn theo userId
   */
  async detailAny(orderId: number): Promise<GetOrderDetailResType> {
    const order = await this.prismaService.order.findUnique({
      where: {
        id: orderId,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });
    if (!order) {
      throw OrderNotFoundException;
    }
    return order as any;
  }

  async cancel(userId: number, orderId: number): Promise<CancelOrderResType> {
    try {
      const order = await this.prismaService.order.findUniqueOrThrow({
        where: {
          id: orderId,
          userId,
          deletedAt: null,
        },
      });
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw CannotCancelOrderException;
      }
      const updatedOrder = await this.prismaService.order.update({
        where: {
          id: orderId,
          userId,
          deletedAt: null,
        },
        data: {
          status: OrderStatus.CANCELLED,
          updatedById: userId,
        },
      });
      return updatedOrder as any;
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw OrderNotFoundException;
      }
      throw error;
    }
  }
}
