import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import envConfig from 'src/shared/config';

@Injectable()
export class BlogAPIKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const blogApiKey = request.headers['authorization']?.split(' ')[1];
    if (blogApiKey !== envConfig.BLOG_API_KEY) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
