import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { Analysis } from './analysis.entity';
import { CoachSession } from './coach-session.entity';
import { ContentsModule } from '../contents/contents.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis, CoachSession]),
    ConfigModule,
    ContentsModule,
    UsersModule,
  ],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService],
})
export class AnalysisModule {}
