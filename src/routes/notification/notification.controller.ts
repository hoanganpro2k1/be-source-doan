import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  GetNotificationsQueryDTO,
  GetNotificationsResDTO,
  GetUnreadCountResDTO,
  NotificationParamsDTO,
} from 'src/routes/notification/notification.dto';
import { NotificationService } from 'src/routes/notification/notification.service';
import { ActiveUser } from 'src/shared/decorators/active-user.decorator';
import { MessageResDTO } from 'src/shared/dtos/response.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ZodResponse({ type: GetNotificationsResDTO })
  list(@ActiveUser('userId') userId: number, @Query() query: GetNotificationsQueryDTO) {
    return this.notificationService.list(userId, query);
  }

  @Get('unread-count')
  @ZodResponse({ type: GetUnreadCountResDTO })
  getUnreadCount(@ActiveUser('userId') userId: number) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @ZodResponse({ type: MessageResDTO })
  async markAllAsRead(@ActiveUser('userId') userId: number) {
    await this.notificationService.markAllAsRead(userId);
    return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
  }

  @Patch(':notificationId/read')
  @ZodResponse({ type: MessageResDTO })
  async markAsRead(@ActiveUser('userId') userId: number, @Param() params: NotificationParamsDTO) {
    await this.notificationService.markAsRead(userId, params.notificationId);
    return { message: 'Đã đánh dấu thông báo là đã đọc' };
  }
}
