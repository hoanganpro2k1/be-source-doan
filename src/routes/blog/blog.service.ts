import { Injectable } from '@nestjs/common';
import { BlogRepo } from 'src/routes/blog/blog.repo';
import { BlogSlugAlreadyExistsException } from 'src/routes/blog/blog.error';
import { CreateBlogBodyType, GetBlogsQueryType, UpdateBlogBodyType } from 'src/routes/blog/blog.model';
import { NotFoundRecordException } from 'src/shared/error';
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers';

// Bỏ dấu tiếng Việt + ký tự đặc biệt, giữ dạng "kebab-case" cho URL bài viết
function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class BlogService {
  constructor(private blogRepo: BlogRepo) {}

  async list(query: GetBlogsQueryType) {
    return this.blogRepo.list(query);
  }

  async findBySlug(slug: string) {
    const blog = await this.blogRepo.findBySlug(slug);
    if (!blog) {
      throw NotFoundRecordException;
    }
    return blog;
  }

  async findById(id: number) {
    const blog = await this.blogRepo.findById(id);
    if (!blog) {
      throw NotFoundRecordException;
    }
    return blog;
  }

  async create({ data, createdById }: { data: CreateBlogBodyType; createdById: number | null }) {
    const baseSlug = slugify(data.title);
    // Hậu tố thời gian để tránh trùng slug khi title giống nhau (n8n có thể đăng nhiều bài cùng chủ đề)
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    try {
      return await this.blogRepo.create({ createdById, slug, data });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw BlogSlugAlreadyExistsException;
      }
      throw error;
    }
  }

  async update({ id, data, updatedById }: { id: number; data: UpdateBlogBodyType; updatedById: number }) {
    try {
      return await this.blogRepo.update({ id, updatedById, data });
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException;
      }
      throw error;
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.blogRepo.delete({ id, deletedById });
      return {
        message: 'Delete successfully',
      };
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException;
      }
      throw error;
    }
  }
}
