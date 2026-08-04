import { OrderBy, SortBy } from 'src/shared/constants/other.constant';
import { CategoryIncludeTranslationSchema } from 'src/shared/models/shared-category.model';
import { ProductTranslationSchema } from 'src/shared/models/shared-product-translation.model';
import { ProductSchema } from 'src/shared/models/shared-product.model';
import { z } from 'zod';

/**
 * Dành cho client và guest
 */
export const GetProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  categories: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        return [Number(value)];
      }
      return value;
    }, z.array(z.coerce.number().int().positive()))
    .optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  techStack: z
    .preprocess((value) => (typeof value === 'string' ? [value] : value), z.array(z.string()))
    .optional(),
  createdById: z.coerce.number().int().positive().optional(),
  orderBy: z.enum([OrderBy.Asc, OrderBy.Desc]).default(OrderBy.Desc),
  sortBy: z.enum([SortBy.CreatedAt, SortBy.Price, SortBy.Sale]).default(SortBy.CreatedAt),
});

/**
 * Dành cho Admin và Seller
 */
export const GetManageProductsQuerySchema = GetProductsQuerySchema.extend({
  isPublic: z.preprocess((value) => value === 'true', z.boolean()).optional(),
  createdById: z.coerce.number().int().positive(),
});

export const GetProductsResSchema = z.object({
  data: z.array(
    ProductSchema.extend({
      productTranslations: z.array(ProductTranslationSchema),
    }),
  ),
  totalItems: z.number(),
  page: z.number(), // Số trang hiện tại
  limit: z.number(), // Số item trên 1 trang
  totalPages: z.number(), // Tổng số trang
});

export const GetProductParamsSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
  })
  .strict();

export const GetProductDetailResSchema = ProductSchema.omit({
  driveUrl: true,
}).extend({
  productTranslations: z.array(ProductTranslationSchema),
  categories: z.array(CategoryIncludeTranslationSchema),
  avgRating: z.number(),
  reviewCount: z.number(),
  downloadCount: z.number(),
});

/**
 * Dành cho Admin/Seller - có thêm driveUrl để xem/sửa link tải, KHÔNG dùng cho response public
 */
export const GetManageProductDetailResSchema = GetProductDetailResSchema.extend({
  driveUrl: ProductSchema.shape.driveUrl,
});

export const CreateProductBodySchema = ProductSchema.pick({
  publishedAt: true,
  name: true,
  basePrice: true,
  virtualPrice: true,
  images: true,
  demoUrl: true,
  githubUrl: true,
  driveUrl: true,
  documentation: true,
  version: true,
  techStack: true,
})
  .extend({
    categories: z.array(z.coerce.number().int().positive()),
  })
  .strict();

export const UpdateProductBodySchema = CreateProductBodySchema;

export type GetProductsResType = z.infer<typeof GetProductsResSchema>;
export type GetProductsQueryType = z.infer<typeof GetProductsQuerySchema>;
export type GetManageProductsQueryType = z.infer<typeof GetManageProductsQuerySchema>;
export type GetProductDetailResType = z.infer<typeof GetProductDetailResSchema>;
export type GetManageProductDetailResType = z.infer<typeof GetManageProductDetailResSchema>;
export type CreateProductBodyType = z.infer<typeof CreateProductBodySchema>;
export type GetProductParamsType = z.infer<typeof GetProductParamsSchema>;
export type UpdateProductBodyType = z.infer<typeof UpdateProductBodySchema>;
