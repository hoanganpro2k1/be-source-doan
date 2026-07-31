import { Injectable } from '@nestjs/common';
import { GetManageReviewsQueryType } from 'src/routes/review/review.model';
import { ReviewRepo } from 'src/routes/review/review.repo';
import { isNotFoundPrismaError } from 'src/shared/helpers';
import { NotFoundRecordException } from 'src/shared/error';

@Injectable()
export class ReviewService {
  constructor(private readonly reviewRepo: ReviewRepo) {}

  list(query: GetManageReviewsQueryType) {
    return this.reviewRepo.list(query);
  }

  async delete(id: number) {
    try {
      await this.reviewRepo.delete(id);
      return { message: 'Delete successfully' };
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException;
      }
      throw error;
    }
  }
}
