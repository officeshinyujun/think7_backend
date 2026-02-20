import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Analysis } from './analysis.entity';
import { ContentsService } from '../contents/contents.service';
import { EVALUATOR_PROMPT, REPORT_GENERATOR_PROMPT, BASIC_EVALUATOR_PROMPT, BASIC_REPORT_GENERATOR_PROMPT } from '../common/prompts';
import { UsersService } from '../users/users.service';

@Injectable()
export class AnalysisService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(Analysis)
    private analysisRepository: Repository<Analysis>,
    private configService: ConfigService,
    private contentsService: ContentsService,
    private usersService: UsersService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY is not defined');
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async createAnalysisReport(userId: string, contentId: string, answers: any[]): Promise<Analysis> {
    const user = await this.usersService.findOne(userId);
    const isPremium = user?.subscription_plan === 'PREMIUM';

    // 1. Fetch Content
    const content = await this.contentsService.findOne(contentId);
    if (!content) {
      throw new HttpException('Content not found', HttpStatus.NOT_FOUND);
    }

    // 2. Evaluate Each Answer
    const evaluationResults: any[] = [];
    const wrongAnswers: any[] = [];
    let totalScore = 0;

    for (const answer of answers) {
      const question = content.questions.find(q => q.id === answer.question_id);
      if (!question) continue;

      const promptTemplate = isPremium ? EVALUATOR_PROMPT : BASIC_EVALUATOR_PROMPT;
      const evalPrompt = promptTemplate.user
        .replace('{{content}}', content.body)
        .replace('{{question}}', question.question_text)
        .replace('{{ideal_answer}}', question.ideal_answer || '')
        .replace('{{keywords}}', JSON.stringify(question.keywords || []))
        .replace('{{scoring_criteria}}', question.scoring_criteria || '')
        .replace('{{user_answer}}', answer.answer_text);

      const evalResult = await this.callOpenAI(promptTemplate.system, evalPrompt);
      
      evaluationResults.push({
        question_type: question.type,
        ...evalResult,
      });

      totalScore += evalResult.score;

      if (evalResult.score < 70) { // Threshold for wrong answer
           wrongAnswers.push({
               number: question.order || 0,
               question: question.question_text,
               wrong_answer: answer.answer_text,
               correct_answer: question.ideal_answer || '',
                relevant_part: evalResult.relevant_part || '',
                explanation: isPremium ? evalResult.feedback : null
           });
      }
    }

    const avgScore = Math.round(totalScore / answers.length);

    // 3. Generate Final Report
    // 3. Generate Final Report
    const reportTemplate = isPremium ? REPORT_GENERATOR_PROMPT : BASIC_REPORT_GENERATOR_PROMPT;
    const reportPrompt = reportTemplate.user.replace('{{evaluations}}', JSON.stringify(evaluationResults));
    const reportResult = await this.callOpenAI(reportTemplate.system, reportPrompt);

    // 4. Save Analysis
    const analysis = this.analysisRepository.create({
      user_id: userId,
      content_id: contentId,
      day: new Date().toISOString().split('T')[0],
      summary: {
        score: reportResult.think_score,
        comment: isPremium ? reportResult.overall_feedback : null
      },
      dimension_scores: [
          { dimension: "핵심 주장 파악", score: reportResult.core_argument_score, status: this.getStatus(reportResult.core_argument_score), comment: "" },
          { dimension: "논리적 추론", score: reportResult.inference_score, status: this.getStatus(reportResult.inference_score), comment: "" },
          { dimension: "비판적 사고", score: reportResult.critical_score, status: this.getStatus(reportResult.critical_score), comment: "" },
          { dimension: "편향 탐지", score: reportResult.bias_score, status: this.getStatus(reportResult.bias_score), comment: "" }
      ],
      thinking_type: isPremium ? {
        type: reportResult.thinking_type,
        description: reportResult.thinking_type_description,
        strength: reportResult.strengths,
        weakness: reportResult.weaknesses
      } : { type: "LOCKED" },
      growth: isPremium ? {
        previous_average_score: 0, // Mock
        current_score: reportResult.think_score,
        trend: 'stable',
        comment: reportResult.improvement_advice
      } : { current_score: reportResult.think_score, trend: "LOCKED" },
      wrong_answer: wrongAnswers,
    });

    return this.analysisRepository.save(analysis);
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI Call Error:', error);
      throw new HttpException('OpenAI Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private getStatus(score: number): string {
      if (score >= 80) return "강점";
      if (score >= 60) return "보통";
      return "약점";
  }

  async findOne(id: string): Promise<Analysis | null> {
    return this.analysisRepository.findOneBy({ id });
  }

  async findAll(userId: string): Promise<Analysis[]> {
    return this.analysisRepository.find({ where: { user_id: userId } });
  }

  async deleteAllByUser(userId: string): Promise<{ deleted: number }> {
    const result = await this.analysisRepository.delete({ user_id: userId });
    return { deleted: result.affected || 0 };
  }
}
