import { z } from 'zod';

export const BlogSchema = z.object({
  id: z.number(),
  title: z.string().max(500),
  slug: z.string().max(500),
  excerpt: z.string(),
  content: z.string(),
  coverImage: z.string().max(1000),
  category: z.string().max(200),
  author: z.string().max(200),
  views: z.number(),
  publishedAt: z.iso.datetime().nullable(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const GetBlogsResSchema = z.object({
  data: z.array(BlogSchema),
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const GetBlogsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
    category: z.string().max(200).optional(),
  })
  .strict();

export const GetBlogParamsSchema = z
  .object({
    slug: z.string().max(500),
  })
  .strict();

export const GetBlogByIdParamsSchema = z
  .object({
    blogId: z.coerce.number(),
  })
  .strict();

export const GetBlogDetailResSchema = BlogSchema;

export const CreateBlogBodySchema = BlogSchema.pick({
  title: true,
  excerpt: true,
  content: true,
  coverImage: true,
  category: true,
}
).extend({
  author: BlogSchema.shape.author.optional(),
  publishedAt: BlogSchema.shape.publishedAt.optional(),
}).strict();

export const UpdateBlogBodySchema = CreateBlogBodySchema.partial();

export type BlogType = z.infer<typeof BlogSchema>;
export type GetBlogsResType = z.infer<typeof GetBlogsResSchema>;
export type GetBlogsQueryType = z.infer<typeof GetBlogsQuerySchema>;
export type GetBlogParamsType = z.infer<typeof GetBlogParamsSchema>;
export type GetBlogByIdParamsType = z.infer<typeof GetBlogByIdParamsSchema>;
export type GetBlogDetailResType = z.infer<typeof GetBlogDetailResSchema>;
export type CreateBlogBodyType = z.infer<typeof CreateBlogBodySchema>;
export type UpdateBlogBodyType = z.infer<typeof UpdateBlogBodySchema>;
