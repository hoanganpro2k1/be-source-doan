import { BadRequestException, NotFoundException } from '@nestjs/common';

export const OrderNotFoundException = new NotFoundException('Error.OrderNotFound');
export const ProductNotFoundException = new NotFoundException('Error.ProductNotFound');
export const NotFoundCartItemException = new NotFoundException('Error.NotFoundCartItem');
export const ProductNotBelongToShopException = new BadRequestException('Error.ProductNotBelongToShop');
export const CannotCancelOrderException = new BadRequestException('Error.CannotCancelOrder');
