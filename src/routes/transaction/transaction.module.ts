import { Module } from '@nestjs/common';
import { TransactionController } from 'src/routes/transaction/transaction.controller';
import { TransactionRepo } from 'src/routes/transaction/transaction.repo';
import { TransactionService } from 'src/routes/transaction/transaction.service';

@Module({
  providers: [TransactionService, TransactionRepo],
  controllers: [TransactionController],
})
export class TransactionModule {}
