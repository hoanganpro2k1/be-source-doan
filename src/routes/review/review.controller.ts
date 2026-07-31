import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { GetManageReviewsQueryDTO, GetManageReviewsResDTO, GetReviewParamsDTO } from 'src/routes/review/review.dto';
import { ReviewService } from 'src/routes/review/review.service';
import { MessageResDTO } from 'src/shared/dtos/response.dto';

@Controller('manage-review/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ZodResponse({ type: GetManageReviewsResDTO })
  list(@Query() query: GetManageReviewsQueryDTO) {
    return this.reviewService.list(query);
  }

  @Delete(':reviewId')
  @ZodResponse({ type: MessageResDTO })
  delete(@Param() params: GetReviewParamsDTO) {
    return this.reviewService.delete(params.reviewId);
  }
}
