import { Module } from '@nestjs/common';
import { OwnershipController } from 'src/routes/ownership/ownership.controller';
import { OwnershipRepo } from 'src/routes/ownership/ownership.repo';
import { OwnershipService } from 'src/routes/ownership/ownership.service';

@Module({
  providers: [OwnershipService, OwnershipRepo],
  controllers: [OwnershipController],
})
export class OwnershipModule {}
