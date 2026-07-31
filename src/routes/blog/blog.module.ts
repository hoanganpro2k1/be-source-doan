import { Module } from '@nestjs/common';
import { BlogController } from 'src/routes/blog/blog.controller';
import { BlogRepo } from 'src/routes/blog/blog.repo';
import { BlogService } from 'src/routes/blog/blog.service';

@Module({
  providers: [BlogService, BlogRepo],
  controllers: [BlogController],
})
export class BlogModule {}
