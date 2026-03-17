import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
// import { AccessTokenGuard } from 'src/shared/guards/access-token.guard';
import { APIKeyGuard } from 'src/shared/guards/api-key.guard';
// import { AuthenticationGuard } from 'src/shared/guards/authentication.guard';
import { PrismaService } from 'src/shared/services/prisma.service';
import { HashingService } from './services/hashing.service';

const sharedServices = [PrismaService, HashingService];

@Global()
@Module({
  imports: [JwtModule],
  providers: [
    ...sharedServices,
    // AccessTokenGuard,
    APIKeyGuard,
    // {
    //   provide: APP_GUARD,
    //   useClass: AuthenticationGuard,
    // },
  ],
  exports: sharedServices,
})
export class SharedModule {}
