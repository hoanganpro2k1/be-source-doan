import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus } from 'src/generated/prisma/client';
import { GetManageOrdersQueryType } from 'src/routes/order/order.model';
import { OrderRepo } from 'src/routes/order/order.repo';
import { NotificationService } from 'src/routes/notification/notification.service';
import { RoleName } from 'src/shared/constants/role.constant';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_PICKUP: 'Chờ lấy hàng',
  PENDING_DELIVERY: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  RETURNED: 'Đã hoàn trả',
  CANCELLED: 'Đã huỷ',
};

@Injectable()
export class ManageOrderService {
  constructor(
    private readonly orderRepo: OrderRepo,
    private readonly notificationService: NotificationService,
  ) {}

  list(query: GetManageOrdersQueryType) {
    return this.orderRepo.listAll(query);
  }

  detail(orderId: number) {
    return this.orderRepo.detailAny(orderId);
  }

  async updateStatus({
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
    const order = await this.orderRepo.updateStatus(orderId, status, updatedById);

    await this.notificationService.notify({
      userId: order.userId,
      type: 'ORDER_STATUS_CHANGED',
      title: 'Cập nhật trạng thái đơn hàng',
      message: `Đơn hàng #${order.id} đã chuyển sang trạng thái: ${ORDER_STATUS_LABEL[status]}`,
      metadata: { orderId: order.id, status },
    });

    return order;
  }
}
