import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { SharedModule } from 'src/shared/shared.module';
import { ProfileService } from 'src/routes/profile/profile.service';

@Module({
  imports: [SharedModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
