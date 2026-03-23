import { Global, Module } from '@nestjs/common';
// import { AccessTokenGuard } from 'src/shared/guards/access-token.guard';
import { APIKeyGuard } from 'src/shared/guards/api-key.guard';
// import { AuthenticationGuard } from 'src/shared/guards/authentication.guard';
import { JwtModule } from '@nestjs/jwt';
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo';
import { EmailService } from 'src/shared/services/email.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TokenService } from 'src/shared/services/token.service';
import { HashingService } from './services/hashing.service';

const sharedServices = [PrismaService, HashingService, EmailService, TokenService, SharedUserRepository];

@Global()
@Module({
  providers: [...sharedServices, APIKeyGuard],
  exports: sharedServices,
  imports: [JwtModule],
})
export class SharedModule {}
