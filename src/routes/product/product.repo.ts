import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import {
  CreateProductBodyType,
  GetManageProductDetailResType,
  GetProductsResType,
  UpdateProductBodyType,
} from 'src/routes/product/product.model';
import { ALL_LANGUAGE_CODE, OrderByType, SortBy, SortByType } from 'src/shared/constants/other.constant';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { ProductType } from 'src/shared/models/shared-product.model';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class ProductRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async list({
    limit,
    page,
    name,
    categories,
    minPrice,
    maxPrice,
    createdById,
    isPublic,
    languageId,
    orderBy,
    sortBy,
  }: {
    limit: number;
    page: number;
    name?: string;
    categories?: number[];
    minPrice?: number;
    maxPrice?: number;
    createdById?: number;
    isPublic?: boolean;
    languageId: string;
    orderBy: OrderByType;
    sortBy: SortByType;
  }): Promise<GetProductsResType> {
    const skip = (page - 1) * limit;
    const take = limit;
    let where: Prisma.ProductWhereInput = {
      deletedAt: null,
      createdById: createdById ? createdById : undefined,
    };
    if (isPublic === true) {
      where.publishedAt = {
        lte: new Date(),
        not: null,
      };
    } else if (isPublic === false) {
      where = {
        ...where,
        OR: [{ publishedAt: null }, { publishedAt: { gt: new Date() } }],
      };
    }
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }
    if (categories && categories.length > 0) {
      where.categories = {
        some: {
          id: {
            in: categories,
          },
        },
      };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {
        gte: minPrice,
        lte: maxPrice,
      };
    }
    // Mặc định sort theo createdAt mới nhất
    let caculatedOrderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {
      createdAt: orderBy,
    };
    if (sortBy === SortBy.Price) {
      caculatedOrderBy = {
        basePrice: orderBy,
      };
    } else if (sortBy === SortBy.Sale) {
      caculatedOrderBy = {
        orders: {
          _count: orderBy,
        },
      };
    }
    const [totalItems, data] = await Promise.all([
      this.prismaService.product.count({
        where,
      }),
      this.prismaService.product.findMany({
        where,
        include: {
          productTranslations: {
            where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
          },
          orders: {
            where: {
              deletedAt: null,
              // status: 'DELIVERED',
            },
          },
        },
        orderBy: caculatedOrderBy,
        skip,
        take,
      }),
    ]);
    return {
      data,
      totalItems,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalItems / limit),
    } as any;
  }

  findById(productId: number): Promise<ProductType | null> {
    return this.prismaService.product.findUnique({
      where: {
        id: productId,
        deletedAt: null,
      },
    }) as any;
  }

  async getDetail({
    productId,
    languageId,
    isPublic,
  }: {
    productId: number;
    languageId: string;
    isPublic?: boolean;
  }): Promise<GetManageProductDetailResType | null> {
    let where: Prisma.ProductWhereUniqueInput = {
      id: productId,
      deletedAt: null,
    };
    if (isPublic === true) {
      where.publishedAt = {
        lte: new Date(),
        not: null,
      };
    } else if (isPublic === false) {
      where = {
        ...where,
        OR: [{ publishedAt: null }, { publishedAt: { gt: new Date() } }],
      };
    }
    const [product, ratingAgg, downloadAgg] = await Promise.all([
      this.prismaService.product.findUnique({
        where,
        include: {
          productTranslations: {
            where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
          },
          categories: {
            where: {
              deletedAt: null,
            },
            include: {
              categoryTranslations: {
                where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
              },
            },
          },
        },
      }),
      this.prismaService.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: true,
      }),
      this.prismaService.userOwnership.aggregate({
        where: { productId },
        _sum: { downloadCount: true },
      }),
    ]);
    if (!product) {
      return null;
    }
    // Tăng lượt xem cho luồng public/client, không tính lượt xem của chủ shop/admin xem đơn quản lý
    if (isPublic === true) {
      void this.prismaService.product.update({
        where: { id: productId },
        data: { viewCount: { increment: 1 } },
      });
    }
    return {
      ...product,
      avgRating: ratingAgg._avg.rating ?? 0,
      reviewCount: ratingAgg._count,
      downloadCount: downloadAgg._sum.downloadCount ?? 0,
    } as any;
  }

  async create({
    createdById,
    data,
  }: {
    createdById: number;
    data: CreateProductBodyType;
  }): Promise<GetManageProductDetailResType> {
    const { categories, ...productData } = data;
    const product = await this.prismaService.product.create({
      data: {
        createdById,
        ...productData,
        categories: {
          connect: categories.map((category) => ({ id: category })),
        },
      },
      include: {
        productTranslations: {
          where: { deletedAt: null },
        },
        categories: {
          where: {
            deletedAt: null,
          },
          include: {
            categoryTranslations: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
    return { ...product, avgRating: 0, reviewCount: 0, downloadCount: 0 } as any;
  }

  async update({
    id,
    updatedById,
    data,
  }: {
    id: number;
    updatedById: number;
    data: UpdateProductBodyType;
  }): Promise<GetManageProductDetailResType> {
    const { categories, ...productData } = data;
    const [product, ratingAgg, downloadAgg] = await Promise.all([
      this.prismaService.product.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          ...productData,
          updatedById,
          categories: {
            connect: categories.map((category) => ({ id: category })),
          },
        },
        include: {
          productTranslations: {
            where: { deletedAt: null },
          },
          categories: {
            where: {
              deletedAt: null,
            },
            include: {
              categoryTranslations: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      this.prismaService.review.aggregate({
        where: { productId: id },
        _avg: { rating: true },
        _count: true,
      }),
      this.prismaService.userOwnership.aggregate({
        where: { productId: id },
        _sum: { downloadCount: true },
      }),
    ]);
    return {
      ...product,
      avgRating: ratingAgg._avg.rating ?? 0,
      reviewCount: ratingAgg._count,
      downloadCount: downloadAgg._sum.downloadCount ?? 0,
    } as any;
  }

  async delete(
    {
      id,
      deletedById,
    }: {
      id: number;
      deletedById: number;
    },
    isHard?: boolean,
  ): Promise<ProductType> {
    if (isHard) {
      return this.prismaService.product.delete({
        where: {
          id,
        },
      }) as any;
    }
    const now = new Date();
    const [product] = await Promise.all([
      this.prismaService.product.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedById,
        },
      }),
      this.prismaService.productTranslation.updateMany({
        where: {
          productId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedById,
        },
      }),
    ]);
    return product as any;
  }
}
