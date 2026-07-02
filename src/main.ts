import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Kích hoạt CORS cho phép Frontend kết nối API tới Backend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // app.useStaticAssets(UPLOAD_DIR, {
  //   prefix: '/media/static',
  // });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Server is running on: http://localhost:${port}`);
}
bootstrap();
