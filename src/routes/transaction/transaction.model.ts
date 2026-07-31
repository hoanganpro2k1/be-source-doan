import { PaginationQuerySchema } from 'src/shared/models/request.model';
import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.number(),
  gateway: z.string(),
  transactionDate: z.iso.datetime(),
  accountNumber: z.string().nullable(),
  subAccount: z.string().nullable(),
  amountIn: z.number(),
  amountOut: z.number(),
  accumulated: z.number(),
  code: z.string().nullable(),
  transactionContent: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  body: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const GetTransactionsQuerySchema = PaginationQuerySchema.extend({
  gateway: z.string().optional(),
  fromDate: z.iso.datetime().optional(),
  toDate: z.iso.datetime().optional(),
});

export const GetTransactionsResSchema = z.object({
  data: z.array(TransactionSchema),
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const GetTransactionParamsSchema = z
  .object({
    transactionId: z.coerce.number().int().positive(),
  })
  .strict();

export type TransactionType = z.infer<typeof TransactionSchema>;
export type GetTransactionsQueryType = z.infer<typeof GetTransactionsQuerySchema>;
export type GetTransactionsResType = z.infer<typeof GetTransactionsResSchema>;
export type GetTransactionParamsType = z.infer<typeof GetTransactionParamsSchema>;
