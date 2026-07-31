import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  CancelOrderResDTO,
  GetManageOrdersQueryDTO,
  GetManageOrdersResDTO,
  GetOrderDetailResDTO,
  GetOrderParamsDTO,
  UpdateOrderStatusBodyDTO,
} from 'src/routes/order/order.dto';
import { ManageOrderService } from 'src/routes/order/manage-order.service';
import { ActiveUser } from 'src/shared/decorators/active-user.decorator';
import { type AccessTokenPayload } from 'src/shared/types/jwt.type';

@Controller('manage-order/orders')
export class ManageOrderController {
  constructor(private readonly manageOrderService: ManageOrderService) {}

  @Get()
  @ZodResponse({ type: GetManageOrdersResDTO })
  list(@Query() query: GetManageOrdersQueryDTO) {
    return this.manageOrderService.list(query);
  }

  @Get(':orderId')
  @ZodResponse({ type: GetOrderDetailResDTO })
  detail(@Param() params: GetOrderParamsDTO) {
    return this.manageOrderService.detail(params.orderId);
  }

  @Patch(':orderId/status')
  @ZodResponse({ type: CancelOrderResDTO })
  updateStatus(
    @Body() body: UpdateOrderStatusBodyDTO,
    @Param() params: GetOrderParamsDTO,
    @ActiveUser() user: AccessTokenPayload,
  ) {
    return this.manageOrderService.updateStatus({
      orderId: params.orderId,
      status: body.status,
      updatedById: user.userId,
      roleNameRequest: user.roleName,
    });
  }
}
