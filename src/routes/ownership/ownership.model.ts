import { z } from 'zod';

export const OwnedProductSchema = z.object({
  productId: z.number(),
  downloadCount: z.number(),
  createdAt: z.iso.datetime(),
  product: z.object({
    id: z.number(),
    name: z.string(),
    images: z.array(z.string()),
    version: z.string(),
  }),
});

export const GetMyOwnershipsResSchema = z.object({
  data: z.array(OwnedProductSchema),
});

export const DownloadProductParamsSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
  })
  .strict();

export const DownloadProductResSchema = z.object({
  url: z.string(),
});

export type OwnedProductType = z.infer<typeof OwnedProductSchema>;
export type GetMyOwnershipsResType = z.infer<typeof GetMyOwnershipsResSchema>;
export type DownloadProductParamsType = z.infer<typeof DownloadProductParamsSchema>;
export type DownloadProductResType = z.infer<typeof DownloadProductResSchema>;
