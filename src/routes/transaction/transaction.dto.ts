import { createZodDto } from 'nestjs-zod';
import {
  GetTransactionParamsSchema,
  GetTransactionsQuerySchema,
  GetTransactionsResSchema,
  TransactionSchema,
} from 'src/routes/transaction/transaction.model';

export class GetTransactionsResDTO extends createZodDto(GetTransactionsResSchema) {}

export class GetTransactionsQueryDTO extends createZodDto(GetTransactionsQuerySchema) {}

export class GetTransactionParamsDTO extends createZodDto(GetTransactionParamsSchema) {}

export class TransactionDTO extends createZodDto(TransactionSchema) {}
