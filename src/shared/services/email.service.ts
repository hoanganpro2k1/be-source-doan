import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import envConfig from 'src/shared/config';

const otpTemplate = fs.readFileSync(path.resolve('src/shared/email-templates/otp.html'), {
  encoding: 'utf-8',
});
const purchaseSuccessTemplate = fs.readFileSync(path.resolve('src/shared/email-templates/purchase-success.html'), {
  encoding: 'utf-8',
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

@Injectable()
export class EmailService {
  private resend: Resend;
  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY);
  }

  async sendOTP(payload: { email: string; code: string }) {
    const subject = 'Mã OTP';
    return await this.resend.emails.send({
      from: envConfig.RESEND_FROM_EMAIL,
      to: [payload.email],
      subject,
      // react: <OTPEmail validationCode={payload.code} title={subject} />
      html: otpTemplate.replaceAll('{{subject}}', subject).replaceAll('{{code}}', payload.code),
    });
  }

  async sendPurchaseSuccess(payload: { email: string; items: { productName: string; driveUrl: string | null }[] }) {
    const subject = 'Cảm ơn bạn đã mua hàng';
    const itemsHtml = payload.items
      .map((item) => {
        const name = escapeHtml(item.productName);
        const link = item.driveUrl
          ? `<a href="${escapeHtml(item.driveUrl)}" style="color: #0066ff;">Tải xuống</a>`
          : 'Liên kết tải sẽ sớm được cập nhật';
        return `<p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 10px;"><strong>${name}</strong> — ${link}</p>`;
      })
      .join('');
    return await this.resend.emails.send({
      from: envConfig.RESEND_FROM_EMAIL,
      to: [payload.email],
      subject,
      html: purchaseSuccessTemplate.replaceAll('{{subject}}', subject).replaceAll('{{items}}', itemsHtml),
    });
  }
}
