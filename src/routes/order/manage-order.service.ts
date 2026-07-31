import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus } from 'src/generated/prisma/client';
import { GetManageOrdersQueryType } from 'src/routes/order/order.model';
import { OrderRepo } from 'src/routes/order/order.repo';
import { RoleName } from 'src/shared/constants/role.constant';

@Injectable()
export class ManageOrderService {
  constructor(private readonly orderRepo: OrderRepo) {}

  list(query: GetManageOrdersQueryType) {
    return this.orderRepo.listAll(query);
  }

  detail(orderId: number) {
    return this.orderRepo.detailAny(orderId);
  }

  updateStatus({
    orderId,
    status,
    updatedById,
    roleNameRequest,
  }: {
    orderId: number;
    status: OrderStatus;
    updatedById: number;
    roleNameRequest: string;
  }) {
    if (roleNameRequest !== RoleName.Admin) {
      throw new ForbiddenException();
    }
    return this.orderRepo.updateStatus(orderId, status, updatedById);
  }
}
