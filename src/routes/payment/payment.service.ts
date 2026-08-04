import { Injectable } from '@nestjs/common';
import { PaymentRepo } from 'src/routes/payment/payment.repo';
import { WebhookPaymentBodyType } from 'src/routes/payment/payment.model';
import { NotificationService } from 'src/routes/notification/notification.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepo: PaymentRepo,
    private readonly notificationService: NotificationService,
  ) {}

  async receiver(body: WebhookPaymentBodyType) {
    const userId = await this.paymentRepo.receiver(body);

    await this.notificationService.notify({
      userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Thanh toán thành công',
      message: 'Đơn hàng của bạn đã được thanh toán thành công',
    });

    return {
      message: 'Payment received successfully',
    };
  }
}
