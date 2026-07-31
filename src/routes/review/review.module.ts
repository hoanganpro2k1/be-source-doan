import { Module } from '@nestjs/common';
import { ReviewController } from 'src/routes/review/review.controller';
import { ReviewRepo } from 'src/routes/review/review.repo';
import { ReviewService } from 'src/routes/review/review.service';

@Module({
  providers: [ReviewService, ReviewRepo],
  controllers: [ReviewController],
})
export class ReviewModule {}
