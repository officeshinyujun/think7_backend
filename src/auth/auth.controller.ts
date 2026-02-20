import { Controller, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: { email: string; password: string }) {
    return this.authService.signup(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('google')
  googleLogin(@Body() body: { firebaseToken: string }) {
    return this.authService.googleLogin(body.firebaseToken);
  }

  @Patch('change-password')
  changePassword(@Body() body: { userId: string; currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(body.userId, body.currentPassword, body.newPassword);
  }

  @Patch('set-password')
  setPassword(@Body() body: { userId: string; newPassword: string }) {
    return this.authService.setPassword(body.userId, body.newPassword);
  }

  @Delete('account')
  deleteAccount(@Query('userId') userId: string) {
    return this.authService.deleteAccount(userId);
  }
}
