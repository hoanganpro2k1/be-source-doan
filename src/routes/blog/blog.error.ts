import { UnprocessableEntityException } from '@nestjs/common';

export const BlogSlugAlreadyExistsException = new UnprocessableEntityException([
  {
    message: 'Error.BlogSlugAlreadyExists',
    path: 'title',
  },
]);
