import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query, Res } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { IsPublic } from 'src/shared/decorators/auth.decorator';
import {
  DisableTwoFactorBodyDTO,
  ForgotPasswordBodyDTO,
  GetAuthorizationUrlResDTO,
  LoginBodyDTO,
  LogoutBodyDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
  SendOTPBodyDTO,
  TwoFactorSetupResDTO,
} from 'src/routes/auth/auth.dto';

import { AuthService } from 'src/routes/auth/auth.service';
import { UserAgent } from 'src/shared/decorators/user-agent.decorator';
import { MessageResDTO } from 'src/shared/dtos/response.dto';
import { GoogleService } from 'src/routes/auth/google.service';
import envConfig from 'src/shared/config';
import type { Response } from 'express';
import { EmptyBodyDTO } from 'src/shared/dtos/request.dto';
import { ActiveUser } from 'src/shared/decorators/active-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
  ) {}

  @Post('register')
  @IsPublic()
  @ZodResponse({ type: RegisterResDTO })
  async register(@Body() body: RegisterBodyDTO) {
    return await this.authService.register(body);
  }

  @Post('otp')
  @IsPublic()
  @ZodResponse({ type: MessageResDTO })
  sendOTP(@Body() body: SendOTPBodyDTO) {
    return this.authService.sendOTP(body);
  }

  @Post('login')
  @IsPublic()
  async login(@Body() body: LoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.login({
      ...body,
      userAgent,
      ip,
    });
  }

  @Post('refresh-token')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: RefreshTokenResDTO })
  refreshToken(@Body() body: RefreshTokenBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent,
      ip,
    });
  }

  @Post('logout')
  @ZodResponse({ type: MessageResDTO })
  logout(@Body() body: LogoutBodyDTO) {
    return this.authService.logout(body.refreshToken);
  }

  @Get('google-link')
  @IsPublic()
  @ZodResponse({ type: GetAuthorizationUrlResDTO })
  getAuthorizationUrl(@UserAgent() userAgent: string, @Ip() ip: string) {
    return this.googleService.getAuthorizationUrl({
      userAgent,
      ip,
    });
  }

  @Get('google/callback')
  @IsPublic()
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      const data = await this.googleService.googleCallback({
        code,
        state,
      });
      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại bằng cách khác';
      return res.redirect(`${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?errorMessage=${message}`);
    }
  }

  @Post('forgot-password')
  @IsPublic()
  @ZodResponse({ type: MessageResDTO })
  forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body);
  }

  // Tại sao không dùng GET mà dùng POST? khi mà body gửi lên là {}
  // Vì POST mang ý nghĩa là tạo ra cái gì đó và POST cũng bảo mật hơn GET
  // Vì GET có thể được kích hoạt thông qua URL trên trình duyệt, POST thì không
  @Post('2fa/setup')
  @ZodResponse({ type: TwoFactorSetupResDTO })
  setupTwoFactorAuth(@Body() _: EmptyBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.setupTwoFactorAuth(userId);
  }

  @Post('2fa/disable')
  @ZodResponse({ type: MessageResDTO })
  disableTwoFactorAuth(@Body() body: DisableTwoFactorBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.disableTwoFactorAuth({
      ...body,
      userId,
    });
  }
}
