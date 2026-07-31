/* eslint-disable @typescript-eslint/no-namespace */

import { ProductTranslationType } from 'src/shared/models/shared-product-translation.model';

declare global {
  namespace PrismaJson {
    type ProductTranslations = Pick<ProductTranslationType, 'id' | 'name' | 'description' | 'languageId'>[];
    type Receiver = {
      name: string;
      phone: string;
      address: string;
    };
  }
}
