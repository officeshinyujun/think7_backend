import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';
import { AuthProvider } from '../users/user.entity';
import { AnalysisService } from '../analysis/analysis.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private jwtSecret: string;

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private analysisService: AnalysisService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
  }

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async signup(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new HttpException('이미 사용 중인 이메일입니다.', HttpStatus.CONFLICT);
    }

    const hashed_password = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({ email, hashed_password, auth_provider: AuthProvider.EMAIL });
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        subscription_plan: user.subscription_plan,
        profile_image: user.profile_image,
        auth_provider: user.auth_provider,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new HttpException('이메일 또는 비밀번호가 올바르지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    const isValid = await bcrypt.compare(password, user.hashed_password);
    if (!isValid) {
      throw new HttpException('이메일 또는 비밀번호가 올바르지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        subscription_plan: user.subscription_plan,
        profile_image: user.profile_image,
        auth_provider: user.auth_provider,
      },
      token,
    };
  }

  async googleLogin(firebaseToken: string) {
    try {
      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const { email, picture } = decodedToken;

      if (!email) {
        throw new HttpException('Google 계정에 이메일이 없습니다.', HttpStatus.BAD_REQUEST);
      }

      // Find or create user
      let user = await this.usersService.findByEmail(email);
      if (!user) {
        // Create new user with Google account (no password needed)
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
        user = await this.usersService.create({
          email,
          hashed_password: randomPassword,
          auth_provider: AuthProvider.GOOGLE,
          profile_image: picture || undefined,
        });
      } else if (user.auth_provider !== AuthProvider.GOOGLE) {
        // Existing user logging in via Google — update auth_provider
        user = (await this.usersService.update(user.id, { auth_provider: AuthProvider.GOOGLE }))!;
      }

      const token = this.generateToken(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          subscription_plan: user.subscription_plan,
          profile_image: user.profile_image,
          auth_provider: user.auth_provider,
        },
        token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Google Login Error:', error);
      throw new HttpException('Google 로그인에 실패했습니다.', HttpStatus.UNAUTHORIZED);
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new HttpException('사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashed_password);
    if (!isValid) {
      throw new HttpException('현재 비밀번호가 올바르지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    if (newPassword.length < 6) {
      throw new HttpException('새 비밀번호는 6자 이상이어야 합니다.', HttpStatus.BAD_REQUEST);
    }

    const hashed_password = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { hashed_password });

    return { message: '비밀번호가 변경되었습니다.' };
  }

  async setPassword(userId: string, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new HttpException('사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    if (newPassword.length < 6) {
      throw new HttpException('비밀번호는 6자 이상이어야 합니다.', HttpStatus.BAD_REQUEST);
    }

    const hashed_password = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { hashed_password, auth_provider: AuthProvider.EMAIL });

    return { message: '비밀번호가 설정되었습니다.' };
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, this.jwtSecret, { expiresIn: '7d' });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      throw new HttpException('유효하지 않은 토큰입니다.', HttpStatus.UNAUTHORIZED);
    }
  }

  async deleteAccount(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new HttpException('사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    // Delete all reports first
    await this.analysisService.deleteAllByUser(userId);
    // Delete user
    await this.usersService.remove(userId);

    return { message: '계정이 삭제되었습니다.' };
  }
}
