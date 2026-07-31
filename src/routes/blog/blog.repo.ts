import { Injectable } from '@nestjs/common';
import {
  BlogType,
  CreateBlogBodyType,
  GetBlogsQueryType,
  GetBlogsResType,
  UpdateBlogBodyType,
} from 'src/routes/blog/blog.model';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class BlogRepo {
  constructor(private prismaService: PrismaService) {}

  async list(query: GetBlogsQueryType): Promise<GetBlogsResType> {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const where = {
      deletedAt: null,
      publishedAt: { not: null },
      ...(query.category && { category: query.category }),
    };
    const [totalItems, data] = await Promise.all([
      this.prismaService.blog.count({ where }),
      this.prismaService.blog.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
      }),
    ]);
    return {
      data,
      totalItems,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(totalItems / query.limit),
    } as any;
  }

  findBySlug(slug: string): Promise<BlogType | null> {
    return this.prismaService.blog.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    }) as any;
  }

  findById(id: number): Promise<BlogType | null> {
    return this.prismaService.blog.findUnique({
      where: {
        id,
        deletedAt: null,
      },
    }) as any;
  }

  create({
    createdById,
    slug,
    data,
  }: {
    createdById: number | null;
    slug: string;
    data: CreateBlogBodyType;
  }): Promise<BlogType> {
    return this.prismaService.blog.create({
      data: {
        ...data,
        slug,
        createdById,
      },
    }) as any;
  }

  update({
    id,
    updatedById,
    data,
  }: {
    id: number;
    updatedById: number;
    data: UpdateBlogBodyType;
  }): Promise<BlogType> {
    return this.prismaService.blog.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        ...data,
        updatedById,
      },
    }) as any;
  }

  delete(
    {
      id,
      deletedById,
    }: {
      id: number;
      deletedById: number;
    },
    isHard?: boolean,
  ): Promise<BlogType> {
    return (
      isHard
        ? this.prismaService.blog.delete({
            where: { id },
          })
        : this.prismaService.blog.update({
            where: {
              id,
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
              deletedById,
            },
          })
    ) as any;
  }

  incrementViews(id: number): Promise<BlogType> {
    return this.prismaService.blog.update({
      where: { id },
      data: {
        views: { increment: 1 },
      },
    }) as any;
  }
}
