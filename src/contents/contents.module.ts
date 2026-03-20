import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';
import { Content } from './content.entity';
import { Question } from '../questions/question.entity';
import { User } from '../users/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Content, Question, User]), forwardRef(() => AuthModule)],
  providers: [ContentsService],
  controllers: [ContentsController],
  exports: [ContentsService],
})
export class ContentsModule {}
