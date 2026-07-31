import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import {
  CreateBlogBodyDTO,
  GetBlogByIdParamsDTO,
  GetBlogDetailResDTO,
  GetBlogParamsDTO,
  GetBlogsQueryDTO,
  GetBlogsResDTO,
  UpdateBlogBodyDTO,
} from 'src/routes/blog/blog.dto';
import { BlogService } from 'src/routes/blog/blog.service';
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator';
import { ActiveUser } from 'src/shared/decorators/active-user.decorator';
import { AuthType, ConditionGuard } from 'src/shared/constants/auth.constant';
import { MessageResDTO } from 'src/shared/dtos/response.dto';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @IsPublic()
  @ZodResponse({ type: GetBlogsResDTO })
  list(@Query() query: GetBlogsQueryDTO) {
    return this.blogService.list(query);
  }

  @Get(':slug')
  @IsPublic()
  @ZodResponse({ type: GetBlogDetailResDTO })
  findBySlug(@Param() params: GetBlogParamsDTO) {
    return this.blogService.findBySlug(params.slug);
  }

  @Post()
  @Auth([AuthType.BlogAPIKey, AuthType.Bearer], { condition: ConditionGuard.Or })
  @ZodResponse({ type: GetBlogDetailResDTO })
  create(@Body() body: CreateBlogBodyDTO, @ActiveUser('userId') userId: number | undefined) {
    return this.blogService.create({
      data: body,
      createdById: userId ?? null,
    });
  }

  @Put(':blogId')
  @ZodResponse({ type: GetBlogDetailResDTO })
  update(
    @Body() body: UpdateBlogBodyDTO,
    @Param() params: GetBlogByIdParamsDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.blogService.update({
      data: body,
      id: params.blogId,
      updatedById: userId,
    });
  }

  @Delete(':blogId')
  @ZodResponse({ type: MessageResDTO })
  delete(@Param() params: GetBlogByIdParamsDTO, @ActiveUser('userId') userId: number) {
    return this.blogService.delete({
      id: params.blogId,
      deletedById: userId,
    });
  }
}
