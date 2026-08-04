import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { HttpExceptionFilter } from 'src/shared/filters/http-exception.filter';
import CustomZodValidationPipe from 'src/shared/pipes/custom-zod-validation.pipe';
import { SharedModule } from 'src/shared/shared.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './routes/auth/auth.module';
import { LanguageModule } from 'src/routes/language/language.module';
import { PermissionModule } from 'src/routes/permission/permission.module';
import { CacheModule } from '@nestjs/cache-manager';
import { RoleModule } from 'src/routes/role/role.module';
import { ProfileModule } from 'src/routes/profile/profile.module';
import { UserModule } from 'src/routes/user/user.module';
import { MediaModule } from 'src/routes/media/media.module';
import { CategoryModule } from 'src/routes/category/category.module';
import { CategoryTranslationModule } from 'src/routes/category/category-translation/category-translation.module';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import path from 'path';
import { ProductModule } from 'src/routes/product/product.module';
import { ProductTranslationModule } from 'src/routes/product/product-translation/product-translation.module';
import { CartModule } from 'src/routes/cart/cart.module';
import { OrderModule } from 'src/routes/order/order.module';
import { OwnershipModule } from 'src/routes/ownership/ownership.module';
import { PaymentModule } from 'src/routes/payment/payment.module';
import { BlogModule } from 'src/routes/blog/blog.module';
import { TransactionModule } from 'src/routes/transaction/transaction.module';
import { ReviewModule } from 'src/routes/review/review.module';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.resolve('src/i18n/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
      // Chỉ tự sinh type hỗ trợ IDE lúc dev; production không cần và không có quyền ghi
      typesOutputPath: process.env.NODE_ENV !== 'production' ? path.resolve('src/generated/i18n.generated.ts') : undefined,
    }),
    SharedModule,
    AuthModule,
    LanguageModule,
    PermissionModule,
    RoleModule,
    ProfileModule,
    UserModule,
    MediaModule,
    CategoryModule,
    CategoryTranslationModule,
    ProductModule,
    ProductTranslationModule,
    CartModule,
    OrderModule,
    OwnershipModule,
    PaymentModule,
    BlogModule,
    TransactionModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // {
    //   provide: APP_FILTER,
    //   useClass: CatchEverythingFilter,
    // },
  ],
})
export class AppModule {}
