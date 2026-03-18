import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
// import { AccessTokenGuard } from 'src/shared/guards/access-token.guard';
import { APIKeyGuard } from 'src/shared/guards/api-key.guard';
// import { AuthenticationGuard } from 'src/shared/guards/authentication.guard';
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo';
import { EmailService } from 'src/shared/services/email.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { HashingService } from './services/hashing.service';

const sharedServices = [PrismaService, HashingService, EmailService, SharedUserRepository];

@Global()
@Module({
  imports: [JwtModule],
  providers: [...sharedServices, APIKeyGuard],
  exports: sharedServices,
})
export class SharedModule {}
