import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard';
import { PaymentAPIKeyGuard } from 'src/shared/guards/payment-api-key.guard';
import { BlogAPIKeyGuard } from 'src/shared/guards/blog-api-key.guard';
import { AuthenticationGuard } from 'src/shared/guards/authentication.guard';
import { SharedRoleRepository } from 'src/shared/repositories/shared-role.repo';
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo';
import { SharedWebsocketRepository } from 'src/shared/repositories/shared-websocket.repo';
import { TwoFactorService } from 'src/shared/services/2fa.service';
import { EmailService } from 'src/shared/services/email.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { S3Service } from 'src/shared/services/s3.service';
import { TokenService } from 'src/shared/services/token.service';
import { HashingService } from './services/hashing.service';

const sharedServices = [
  PrismaService,
  HashingService,
  EmailService,
  TokenService,
  TwoFactorService,
  SharedUserRepository,
  SharedRoleRepository,
  SharedWebsocketRepository,
  S3Service,
];

@Global()
@Module({
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    PaymentAPIKeyGuard,
    BlogAPIKeyGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: sharedServices,
  imports: [JwtModule],
})
export class SharedModule {}
