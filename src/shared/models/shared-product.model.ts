import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.number(),
  publishedAt: z.iso.datetime().nullable(),
  name: z.string().trim().max(500),
  basePrice: z.number().min(0),
  virtualPrice: z.number().min(0),
  images: z.array(z.string()),
  demoUrl: z.string().trim().max(1000).nullable(),
  githubUrl: z.string().trim().max(1000).nullable(),
  // Link Google Drive chứa file nén source code - CHỈ dùng nội bộ (admin form + ownership download),
  // không được thêm vào bất kỳ response schema public nào để tránh lộ cho người chưa mua.
  driveUrl: z.string().trim().max(1000).nullable(),
  documentation: z.string().nullable(),
  version: z.string().trim().max(50),
  techStack: z.array(z.string()),
  viewCount: z.number().int(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProductType = z.infer<typeof ProductSchema>;
