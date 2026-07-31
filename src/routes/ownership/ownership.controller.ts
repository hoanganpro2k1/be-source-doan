import { Controller, Get, Param } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  DownloadProductParamsDTO,
  DownloadProductResDTO,
  GetMyOwnershipsResDTO,
} from 'src/routes/ownership/ownership.dto';
import { OwnershipService } from 'src/routes/ownership/ownership.service';
import { ActiveUser } from 'src/shared/decorators/active-user.decorator';

@Controller('ownership')
export class OwnershipController {
  constructor(private readonly ownershipService: OwnershipService) {}

  @Get('products')
  @ZodResponse({ type: GetMyOwnershipsResDTO })
  listMine(@ActiveUser('userId') userId: number) {
    return this.ownershipService.listMine(userId);
  }

  @Get('products/:productId/download')
  @ZodResponse({ type: DownloadProductResDTO })
  download(@ActiveUser('userId') userId: number, @Param() param: DownloadProductParamsDTO) {
    return this.ownershipService.getDownloadUrl(userId, param.productId);
  }
}
