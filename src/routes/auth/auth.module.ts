import { Module } from '@nestjs/common';
import { AuthRepository } from 'src/routes/auth/auth.repo';
import { SharedModule } from 'src/shared/shared.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleService } from 'src/routes/auth/google.service';

@Module({
  imports: [SharedModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleService],
})
export class AuthModule {}
