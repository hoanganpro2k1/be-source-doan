import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { GetTransactionsQueryType, GetTransactionsResType, TransactionType } from 'src/routes/transaction/transaction.model';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class TransactionRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async list(query: GetTransactionsQueryType): Promise<GetTransactionsResType> {
    const { page, limit, gateway, fromDate, toDate } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.PaymentTransactionWhereInput = {
      gateway,
      transactionDate:
        fromDate || toDate
          ? {
              gte: fromDate ? new Date(fromDate) : undefined,
              lte: toDate ? new Date(toDate) : undefined,
            }
          : undefined,
    };

    const [totalItems, data] = await Promise.all([
      this.prismaService.paymentTransaction.count({ where }),
      this.prismaService.paymentTransaction.findMany({
        where,
        skip,
        take,
        orderBy: {
          transactionDate: 'desc',
        },
      }),
    ]);

    return {
      data: data as any,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  findById(id: number): Promise<TransactionType | null> {
    return this.prismaService.paymentTransaction.findUnique({
      where: { id },
    }) as any;
  }
}
