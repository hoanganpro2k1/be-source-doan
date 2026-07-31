import { createZodDto } from 'nestjs-zod';
import {
  DownloadProductParamsSchema,
  DownloadProductResSchema,
  GetMyOwnershipsResSchema,
} from 'src/routes/ownership/ownership.model';

export class GetMyOwnershipsResDTO extends createZodDto(GetMyOwnershipsResSchema) {}

export class DownloadProductParamsDTO extends createZodDto(DownloadProductParamsSchema) {}

export class DownloadProductResDTO extends createZodDto(DownloadProductResSchema) {}
