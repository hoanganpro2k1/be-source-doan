import { createZodDto } from 'nestjs-zod';
import {
  CreateBlogBodySchema,
  GetBlogByIdParamsSchema,
  GetBlogDetailResSchema,
  GetBlogParamsSchema,
  GetBlogsQuerySchema,
  GetBlogsResSchema,
  UpdateBlogBodySchema,
} from 'src/routes/blog/blog.model';

export class GetBlogsResDTO extends createZodDto(GetBlogsResSchema) {}

export class GetBlogsQueryDTO extends createZodDto(GetBlogsQuerySchema) {}

export class GetBlogParamsDTO extends createZodDto(GetBlogParamsSchema) {}

export class GetBlogByIdParamsDTO extends createZodDto(GetBlogByIdParamsSchema) {}

export class GetBlogDetailResDTO extends createZodDto(GetBlogDetailResSchema) {}

export class CreateBlogBodyDTO extends createZodDto(CreateBlogBodySchema) {}

export class UpdateBlogBodyDTO extends createZodDto(UpdateBlogBodySchema) {}
