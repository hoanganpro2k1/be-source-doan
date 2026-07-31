import { ForbiddenException } from '@nestjs/common';

export const ProductNotOwnedException = new ForbiddenException('Error.Product.NotOwned');

export const DownloadUrlNotAvailableException = new ForbiddenException('Error.Product.DownloadUrlNotAvailable');
