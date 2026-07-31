import { Injectable } from '@nestjs/common';
import { DownloadUrlNotAvailableException, ProductNotOwnedException } from 'src/routes/ownership/ownership.error';
import { DownloadProductResType, GetMyOwnershipsResType } from 'src/routes/ownership/ownership.model';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class OwnershipRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async listMine(userId: number): Promise<GetMyOwnershipsResType> {
    const data = await this.prismaService.userOwnership.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data } as any;
  }

  async getDownloadUrl(userId: number, productId: number): Promise<DownloadProductResType> {
    const ownership = await this.prismaService.userOwnership.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        product: {
          select: {
            driveUrl: true,
          },
        },
      },
    });
    if (!ownership) {
      throw ProductNotOwnedException;
    }
    if (!ownership.product.driveUrl) {
      throw DownloadUrlNotAvailableException;
    }
    await this.prismaService.userOwnership.update({
      where: { id: ownership.id },
      data: { downloadCount: { increment: 1 } },
    });
    return { url: ownership.product.driveUrl };
  }
}
