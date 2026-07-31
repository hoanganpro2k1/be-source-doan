import { PaginationQuerySchema } from 'src/shared/models/request.model';
import { z } from 'zod';

export const ReviewMediaSchema = z.object({
  id: z.number(),
  url: z.string(),
  type: z.enum(['IMAGE', 'VIDEO']),
  reviewId: z.number(),
  createdAt: z.iso.datetime(),
});

export const ReviewSchema = z.object({
  id: z.number(),
  content: z.string(),
  rating: z.number().int().min(1).max(5),
  orderId: z.number(),
  productId: z.number(),
  userId: z.number(),
  updateCount: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const GetManageReviewsQuerySchema = PaginationQuerySchema.extend({
  productId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const GetManageReviewsResSchema = z.object({
  data: z.array(
    ReviewSchema.extend({
      medias: z.array(ReviewMediaSchema),
      user: z.object({ id: z.number(), name: z.string(), avatar: z.string().nullable() }),
      product: z.object({ id: z.number(), name: z.string() }),
    }),
  ),
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const GetReviewParamsSchema = z
  .object({
    reviewId: z.coerce.number().int().positive(),
  })
  .strict();

export type ReviewType = z.infer<typeof ReviewSchema>;
export type GetManageReviewsQueryType = z.infer<typeof GetManageReviewsQuerySchema>;
export type GetManageReviewsResType = z.infer<typeof GetManageReviewsResSchema>;
export type GetReviewParamsType = z.infer<typeof GetReviewParamsSchema>;
