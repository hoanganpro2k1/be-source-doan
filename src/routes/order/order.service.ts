import { Injectable } from '@nestjs/common';
import { CreateOrderBodyType, GetOrderListQueryType } from 'src/routes/order/order.model';
import { OrderRepo } from 'src/routes/order/order.repo';
import { NotificationService } from 'src/routes/notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepo,
    private readonly notificationService: NotificationService,
  ) {}

  async list(userId: number, query: GetOrderListQueryType) {
    return this.orderRepo.list(userId, query);
  }

  async create(userId: number, body: CreateOrderBodyType) {
    const result = await this.orderRepo.create(userId, body);

    // Thông báo cho từng seller (shopId) biết có đơn hàng mới
    await Promise.all(
      result.orders.map((order) =>
        this.notificationService.notify({
          userId: order.shopId as number,
          type: 'ORDER_CREATED',
          title: 'Đơn hàng mới',
          message: `Bạn có đơn hàng mới #${order.id}`,
          metadata: { orderId: order.id },
        }),
      ),
    );

    return result;
  }

  async cancel(userId: number, orderId: number) {
    const order = await this.orderRepo.cancel(userId, orderId);

    if (order.shopId) {
      await this.notificationService.notify({
        userId: order.shopId,
        type: 'ORDER_CANCELLED',
        title: 'Đơn hàng đã bị huỷ',
        message: `Đơn hàng #${order.id} đã bị người mua huỷ`,
        metadata: { orderId: order.id },
      });
    }

    return order;
  }

  detail(userId: number, orderId: number) {
    return this.orderRepo.detail(userId, orderId);
  }
}
