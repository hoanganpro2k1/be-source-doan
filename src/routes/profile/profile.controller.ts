import { ActiveUser } from 'src/shared/decorators/active-user.decorator';
import { MessageResDTO } from 'src/shared/dtos/response.dto';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ZodResponse, ZodSerializerDto } from 'nestjs-zod';
import { ChangePasswordBodyDTO, UpdateMeBodyDTO } from 'src/routes/profile/profile.dto';
import { ProfileService } from 'src/routes/profile/profile.service';
import { GetUserProfileResDTO, UpdateProfileResDTO } from 'src/shared/dtos/shared-user.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ZodResponse({ type: GetUserProfileResDTO })
  getProfile(@ActiveUser('userId') userId: number) {
    return this.profileService.getProfile(userId);
  }

  @Put()
  @ZodResponse({ type: UpdateProfileResDTO })
  updateProfile(@Body() body: UpdateMeBodyDTO, @ActiveUser('userId') userId: number) {
    return this.profileService.updateProfile({
      userId,
      body,
    });
  }

  @Put('change-password')
  @ZodResponse({ type: MessageResDTO })
  changePassword(@Body() body: ChangePasswordBodyDTO, @ActiveUser('userId') userId: number) {
    return this.profileService.changePassword({
      userId,
      body,
    });
  }
}
