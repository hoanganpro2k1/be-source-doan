import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from 'src/generated/prisma/client';
import { GetNotificationsQueryType, GetNotificationsResType } from 'src/routes/notification/notification.model';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class NotificationRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async list(userId: number, query: GetNotificationsQueryType): Promise<GetNotificationsResType> {
    const { page, limit, unreadOnly } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.NotificationWhereInput = {
      userId,
      readAt: unreadOnly ? null : undefined,
    };

    const [totalItems, data, unreadCount] = await Promise.all([
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      data: data as any,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      unreadCount,
    };
  }

  countUnread(userId: number) {
    return this.prismaService.notification.count({ where: { userId, readAt: null } });
  }

  markAsRead(userId: number, notificationId: number) {
    return this.prismaService.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markAllAsRead(userId: number) {
    return this.prismaService.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  create(data: { userId: number; type: NotificationType; title: string; message: string; metadata?: object }) {
    return this.prismaService.notification.create({ data });
  }
}
