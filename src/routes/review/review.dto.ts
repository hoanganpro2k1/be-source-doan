import { createZodDto } from 'nestjs-zod';
import {
  GetManageReviewsQuerySchema,
  GetManageReviewsResSchema,
  GetReviewParamsSchema,
} from 'src/routes/review/review.model';

export class GetManageReviewsResDTO extends createZodDto(GetManageReviewsResSchema) {}

export class GetManageReviewsQueryDTO extends createZodDto(GetManageReviewsQuerySchema) {}

export class GetReviewParamsDTO extends createZodDto(GetReviewParamsSchema) {}
