import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderRepo } from './order.repo';
import { OrderController } from 'src/routes/order/order.controller';
import { ManageOrderController } from 'src/routes/order/manage-order.controller';
import { ManageOrderService } from 'src/routes/order/manage-order.service';
import { NotificationModule } from 'src/routes/notification/notification.module';
// import { BullModule } from '@nestjs/bullmq';
// import { PAYMENT_QUEUE_NAME } from 'src/shared/constants/queue.constant';
// import { OrderProducer } from 'src/routes/order/order.producer';

@Module({
  imports: [
    NotificationModule,
    // BullModule.registerQueue({
    //   name: PAYMENT_QUEUE_NAME,
    // }),
  ],
  providers: [OrderService, OrderRepo, ManageOrderService],
  controllers: [OrderController, ManageOrderController],
})
export class OrderModule {}
