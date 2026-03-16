import { Controller, Post, Body, Get, Param, Query, Delete } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { Analysis } from './analysis.entity';

@Controller()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('analysis')
  async create(@Body() body: { userId: string; contentId: string; answers: any[] }) {
    return this.analysisService.createAnalysisReport(body.userId, body.contentId, body.answers);
  }

  @Get('report/:id')
  findOne(@Param('id') id: string): Promise<Analysis | null> {
    return this.analysisService.findOne(id);
  }

  @Post('report/:id/coach')
  async coachUser(
    @Param('id') id: string,
    @Body() body: { questionNumber: number; chatHistory: any[]; sessionId?: string }
  ) {
    return this.analysisService.coachUser(id, body.questionNumber, body.chatHistory, body.sessionId);
  }

  @Get('coach-sessions')
  listSessions(@Query('userId') userId: string) {
    return this.analysisService.listCoachSessions(userId);
  }

  @Get('report/:id/coach/:qid')
  async getCoachSession(
    @Param('id') id: string,
    @Param('qid') qid: string,
  ) {
    return this.analysisService.getCoachSession(id, parseInt(qid, 10));
  }

  @Delete('coach-sessions/all')
  deleteAllCoachSessions() {
    return this.analysisService.deleteAllCoachSessions();
  }

  @Get('report')
  findAll(@Query('userId') userId: string): Promise<Analysis[]> {
    return this.analysisService.findAll(userId);
  }

  @Delete('report')
  deleteAll(@Query('userId') userId: string) {
    return this.analysisService.deleteAllByUser(userId);
  }
}
