import { PaginationQuerySchema } from 'src/shared/models/request.model';
import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'PAYMENT_SUCCESS',
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'ORDER_CANCELLED',
]);

export const NotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const GetNotificationsQuerySchema = PaginationQuerySchema.extend({
  unreadOnly: z.preprocess((value) => value === 'true', z.boolean()).optional(),
});

export const GetNotificationsResSchema = z.object({
  data: z.array(NotificationSchema),
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  unreadCount: z.number(),
});

export const GetUnreadCountResSchema = z.object({
  count: z.number(),
});

export const NotificationParamsSchema = z
  .object({
    notificationId: z.coerce.number().int().positive(),
  })
  .strict();

export type NotificationTypeEnum = z.infer<typeof NotificationTypeSchema>;
export type NotificationModelType = z.infer<typeof NotificationSchema>;
export type GetNotificationsQueryType = z.infer<typeof GetNotificationsQuerySchema>;
export type GetNotificationsResType = z.infer<typeof GetNotificationsResSchema>;
export type GetUnreadCountResType = z.infer<typeof GetUnreadCountResSchema>;
export type NotificationParamsType = z.infer<typeof NotificationParamsSchema>;
