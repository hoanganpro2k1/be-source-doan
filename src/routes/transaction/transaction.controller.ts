import { Controller, Get, Param, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  GetTransactionParamsDTO,
  GetTransactionsQueryDTO,
  GetTransactionsResDTO,
  TransactionDTO,
} from 'src/routes/transaction/transaction.dto';
import { TransactionService } from 'src/routes/transaction/transaction.service';

@Controller('manage-transaction/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ZodResponse({ type: GetTransactionsResDTO })
  list(@Query() query: GetTransactionsQueryDTO) {
    return this.transactionService.list(query);
  }

  @Get(':transactionId')
  @ZodResponse({ type: TransactionDTO })
  findById(@Param() params: GetTransactionParamsDTO) {
    return this.transactionService.findById(params.transactionId);
  }
}
