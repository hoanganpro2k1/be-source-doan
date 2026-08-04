import { Injectable } from '@nestjs/common';
import { NotificationType } from 'src/generated/prisma/client';
import { GetNotificationsQueryType } from 'src/routes/notification/notification.model';
import { NotificationGateway } from 'src/routes/notification/notification.gateway';
import { NotificationRepo } from 'src/routes/notification/notification.repo';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepo: NotificationRepo,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  list(userId: number, query: GetNotificationsQueryType) {
    return this.notificationRepo.list(userId, query);
  }

  async getUnreadCount(userId: number) {
    const count = await this.notificationRepo.countUnread(userId);
    return { count };
  }

  markAsRead(userId: number, notificationId: number) {
    return this.notificationRepo.markAsRead(userId, notificationId);
  }

  markAllAsRead(userId: number) {
    return this.notificationRepo.markAllAsRead(userId);
  }

  /**
   * Ghi thông báo vào DB và đẩy real-time qua Socket.IO nếu user đang online.
   * Dùng bởi các domain khác (order/payment) sau khi hoàn tất thao tác nghiệp vụ.
   */
  async notify(data: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: object;
  }) {
    const notification = await this.notificationRepo.create(data);
    this.notificationGateway.emitToUser(data.userId, notification);
    return notification;
  }
}
