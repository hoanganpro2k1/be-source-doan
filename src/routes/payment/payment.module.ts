import { Module } from '@nestjs/common';
import { PaymentRepo } from 'src/routes/payment/payment.repo';
// import { PaymentProducer } from 'src/routes/payment/payment.producer';
import { PaymentService } from 'src/routes/payment/payment.service';
import { PaymentController } from 'src/routes/payment/payment.controller';
// import { BullModule } from '@nestjs/bullmq';
// import { PAYMENT_QUEUE_NAME } from 'src/shared/constants/queue.constant';

@Module({
  //   imports: [
  //     BullModule.registerQueue({
  //       name: PAYMENT_QUEUE_NAME,
  //     }),
  //   ],
  providers: [PaymentService, PaymentRepo],
  controllers: [PaymentController],
})
export class PaymentModule {}
