import { createZodDto } from 'nestjs-zod';
import {
  GetNotificationsQuerySchema,
  GetNotificationsResSchema,
  GetUnreadCountResSchema,
  NotificationParamsSchema,
} from 'src/routes/notification/notification.model';

export class GetNotificationsResDTO extends createZodDto(GetNotificationsResSchema) {}

export class GetNotificationsQueryDTO extends createZodDto(GetNotificationsQuerySchema) {}

export class GetUnreadCountResDTO extends createZodDto(GetUnreadCountResSchema) {}

export class NotificationParamsDTO extends createZodDto(NotificationParamsSchema) {}
