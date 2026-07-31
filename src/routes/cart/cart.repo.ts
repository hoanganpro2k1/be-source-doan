import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import {
  NotFoundCartItemException,
  ProductNotFoundException,
} from 'src/routes/cart/cart.error';
import {
  AddToCartBodyType,
  CartItemDetailType,
  CartItemType,
  DeleteCartBodyType,
  GetCartResType,
  UpdateCartItemBodyType,
} from 'src/routes/cart/cart.model';
import { ALL_LANGUAGE_CODE } from 'src/shared/constants/other.constant';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { isNotFoundPrismaError } from 'src/shared/helpers';
import { ProductType } from 'src/shared/models/shared-product.model';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class CartRepo {
  constructor(private readonly prismaService: PrismaService) {}

  private async validateProduct(productId: number): Promise<ProductType> {
    const product = await this.prismaService.product.findUnique({
      where: { id: productId, deletedAt: null },
    });
    // Kiểm tra tồn tại của sản phẩm
    if (!product) {
      throw ProductNotFoundException;
    }
    // Kiểm tra sản phẩm đã bị xóa hoặc có công khai hay không
    if (
      product.deletedAt !== null ||
      product.publishedAt === null ||
      (product.publishedAt !== null && product.publishedAt > new Date())
    ) {
      throw ProductNotFoundException;
    }
    return product as any;
  }

  async list({
    userId,
    languageId,
    page,
    limit,
  }: {
    userId: number;
    languageId: string;
    limit: number;
    page: number;
  }): Promise<GetCartResType> {
    const cartItems = await this.prismaService.cartItem.findMany({
      where: {
        userId,
        product: {
          deletedAt: null,
          publishedAt: {
            lte: new Date(),
            not: null,
          },
        },
      },
      include: {
        product: {
          include: {
            productTranslations: {
              where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
            },
            createdBy: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    const groupMap = new Map<number, CartItemDetailType>();
    for (const cartItem of cartItems) {
      const shopId = cartItem.product.createdById;
      if (shopId) {
        if (!groupMap.has(shopId)) {
          groupMap.set(shopId, { shop: cartItem.product.createdBy, cartItems: [] });
        }
        groupMap.get(shopId)?.cartItems.push(cartItem as any);
      }
    }
    const sortedGroups = Array.from(groupMap.values());
    const skip = (page - 1) * limit;
    const take = limit;
    const totalGroups = sortedGroups.length;
    const pagedGroups = sortedGroups.slice(skip, skip + take);
    return {
      data: pagedGroups,
      totalItems: totalGroups,
      limit,
      page,
      totalPages: Math.ceil(totalGroups / limit),
    };
  }

  async list2({
    userId,
    languageId,
    page,
    limit,
  }: {
    userId: number;
    languageId: string;
    limit: number;
    page: number;
  }): Promise<GetCartResType> {
    const skip = (page - 1) * limit;
    const take = limit;
    // Đếm tổng số nhóm sản phẩm
    const totalItems$ = this.prismaService.$queryRaw<{ createdById: number }[]>`
      SELECT
        "Product"."createdById"
      FROM "CartItem"
      JOIN "Product" ON "CartItem"."productId" = "Product"."id"
      WHERE "CartItem"."userId" = ${userId}
        AND "Product"."deletedAt" IS NULL
        AND "Product"."publishedAt" IS NOT NULL
        AND "Product"."publishedAt" <= NOW()
      GROUP BY "Product"."createdById"
    `;
    const data$ = this.prismaService.$queryRaw<CartItemDetailType[]>`
     SELECT
       "Product"."createdById",
       json_agg(
         jsonb_build_object(
           'id', "CartItem"."id",
           'quantity', "CartItem"."quantity",
           'productId', "CartItem"."productId",
           'userId', "CartItem"."userId",
           'createdAt', to_char("CartItem"."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'updatedAt', to_char("CartItem"."updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'product', jsonb_build_object(
              'id', "Product"."id",
              'publishedAt', to_char("Product"."publishedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              'name', "Product"."name",
              'basePrice', "Product"."basePrice",
              'virtualPrice', "Product"."virtualPrice",
              'images', "Product"."images",
              'demoUrl', "Product"."demoUrl",
              'githubUrl', "Product"."githubUrl",
              'documentation', "Product"."documentation",
              'version', "Product"."version",
              'techStack', "Product"."techStack",
              'viewCount', "Product"."viewCount",
              'productTranslations', COALESCE((
                SELECT json_agg(
                  jsonb_build_object(
                    'id', pt."id",
                    'productId', pt."productId",
                    'languageId', pt."languageId",
                    'name', pt."name",
                    'description', pt."description"
                  )
                ) FILTER (WHERE pt."id" IS NOT NULL)
                FROM "ProductTranslation" pt
                WHERE pt."productId" = "Product"."id"
                  AND pt."deletedAt" IS NULL
                  ${languageId === ALL_LANGUAGE_CODE ? Prisma.sql`` : Prisma.sql`AND pt."languageId" = ${languageId}`}
              ), '[]'::json)
           )
         ) ORDER BY "CartItem"."updatedAt" DESC
       ) AS "cartItems",
       jsonb_build_object(
         'id', "User"."id",
         'name', "User"."name",
         'avatar', "User"."avatar"
       ) AS "shop"
     FROM "CartItem"
     JOIN "Product" ON "CartItem"."productId" = "Product"."id"
     LEFT JOIN "ProductTranslation" ON "Product"."id" = "ProductTranslation"."productId"
       AND "ProductTranslation"."deletedAt" IS NULL
       ${languageId === ALL_LANGUAGE_CODE ? Prisma.sql`` : Prisma.sql`AND "ProductTranslation"."languageId" = ${languageId}`}
     LEFT JOIN "User" ON "Product"."createdById" = "User"."id"
     WHERE "CartItem"."userId" = ${userId}
        AND "Product"."deletedAt" IS NULL
        AND "Product"."publishedAt" IS NOT NULL
        AND "Product"."publishedAt" <= NOW()
     GROUP BY "Product"."createdById", "User"."id"
     ORDER BY MAX("CartItem"."updatedAt") DESC
      LIMIT ${take}
      OFFSET ${skip}
   `;
    const [data, totalItems] = await Promise.all([data$, totalItems$]);
    return {
      data,
      page,
      limit,
      totalItems: totalItems.length,
      totalPages: Math.ceil(totalItems.length / limit),
    };
  }

  async create(userId: number, body: AddToCartBodyType): Promise<CartItemType> {
    await this.validateProduct(body.productId);

    return this.prismaService.cartItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId: body.productId,
        },
      },
      update: {
        quantity: {
          increment: body.quantity,
        },
      },
      create: {
        userId,
        productId: body.productId,
        quantity: body.quantity,
      },
    }) as any;
  }

  async update({
    userId,
    body,
    cartItemId,
  }: {
    userId: number;
    cartItemId: number;
    body: UpdateCartItemBodyType;
  }): Promise<CartItemType> {
    await this.validateProduct(body.productId);

    return this.prismaService.cartItem
      .update({
        where: {
          id: cartItemId,
          userId,
        },
        data: {
          productId: body.productId,
          quantity: body.quantity,
        },
      })
      .catch((error) => {
        if (isNotFoundPrismaError(error)) {
          throw NotFoundCartItemException;
        }
        throw error;
      }) as any;
  }

  delete(userId: number, body: DeleteCartBodyType): Promise<{ count: number }> {
    return this.prismaService.cartItem.deleteMany({
      where: {
        id: {
          in: body.cartItemIds,
        },
        userId,
      },
    });
  }
}
