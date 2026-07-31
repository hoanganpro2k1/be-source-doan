import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { GetManageReviewsQueryType, GetManageReviewsResType } from 'src/routes/review/review.model';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class ReviewRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async list(query: GetManageReviewsQueryType): Promise<GetManageReviewsResType> {
    const { page, limit, productId, userId, rating } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.ReviewWhereInput = {
      productId,
      userId,
      rating,
    };

    const [totalItems, data] = await Promise.all([
      this.prismaService.review.count({ where }),
      this.prismaService.review.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          medias: true,
          user: {
            select: { id: true, name: true, avatar: true },
          },
          product: {
            select: { id: true, name: true },
          },
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

  delete(id: number) {
    return this.prismaService.review.delete({
      where: { id },
    });
  }
}
