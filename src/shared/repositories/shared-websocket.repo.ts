import { Injectable } from '@nestjs/common';
import { SerializeAll } from 'src/shared/constants/serialize.decorator';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
@SerializeAll()
export class SharedWebsocketRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: { id: string; userId: number }) {
    return this.prismaService.websocket.create({ data });
  }

  delete(id: string) {
    return this.prismaService.websocket.deleteMany({ where: { id } });
  }

  findMany(userId: number) {
    return this.prismaService.websocket.findMany({ where: { userId } });
  }
}
