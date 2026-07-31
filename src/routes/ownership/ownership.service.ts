import { Injectable } from '@nestjs/common';
import { OwnershipRepo } from 'src/routes/ownership/ownership.repo';

@Injectable()
export class OwnershipService {
  constructor(private readonly ownershipRepo: OwnershipRepo) {}

  listMine(userId: number) {
    return this.ownershipRepo.listMine(userId);
  }

  getDownloadUrl(userId: number, productId: number) {
    return this.ownershipRepo.getDownloadUrl(userId, productId);
  }
}
