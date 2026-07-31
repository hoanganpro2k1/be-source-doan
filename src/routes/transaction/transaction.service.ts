import { Injectable } from '@nestjs/common';
import { GetTransactionsQueryType } from 'src/routes/transaction/transaction.model';
import { TransactionRepo } from 'src/routes/transaction/transaction.repo';
import { NotFoundRecordException } from 'src/shared/error';

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepo: TransactionRepo) {}

  list(query: GetTransactionsQueryType) {
    return this.transactionRepo.list(query);
  }

  async findById(id: number) {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) {
      throw NotFoundRecordException;
    }
    return transaction;
  }
}
