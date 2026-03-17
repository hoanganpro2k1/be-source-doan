import { Module } from '@nestjs/common';
import { AuthRepository } from 'src/routes/auth/auth.repo';
import { RolesService } from 'src/routes/auth/roles.service';
import { SharedModule } from 'src/shared/shared.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SharedModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, RolesService],
})
export class AuthModule {}
