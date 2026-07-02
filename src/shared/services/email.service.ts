import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import envConfig from 'src/shared/config';

const otpTemplate = fs.readFileSync(path.resolve('src/shared/email-templates/otp.html'), {
  encoding: 'utf-8',
});

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
}
