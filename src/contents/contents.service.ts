import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import OpenAI from 'openai';
import { Content, ContentDifficulty } from './content.entity';
import { Question, QuestionType } from '../questions/question.entity';
import { User, UserSubscription } from '../users/user.entity';
import { CONTENT_GENERATOR_PROMPT } from '../common/prompts';
import { Between } from 'typeorm';

@Injectable()
export class ContentsService {
  private readonly logger = new Logger(ContentsService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY is not defined');
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async create(createContentDto: Partial<Content>): Promise<Content> {
    const content = this.contentRepository.create(createContentDto);
    return this.contentRepository.save(content);
  }

  findAll(): Promise<Content[]> {
    return this.contentRepository.find();
  }

  async findLibrary(topic?: string): Promise<Content[]> {
    const where: any = {};
    if (topic) where.topic = topic;
    return this.contentRepository.find({
      where,
      order: { published_date: 'DESC', created_at: 'DESC' },
      relations: ['questions'],
    });
  }

  async findToday(): Promise<Content | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.contentRepository.findOne({
      where: { published_date: today },
      order: { created_at: 'ASC' },
      relations: ['questions'],
    });
  }

  async findOne(id: string): Promise<Content | null> {
    return this.contentRepository.findOne({
      where: { id },
      relations: ['questions'],
    });
  }

  async generateContent(topic: string, userId: string | null, type?: string): Promise<Content> {
    try {
      // Check user limit if userId is provided
      if (userId) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        if (user.subscription_plan === UserSubscription.FREE) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const count = await this.contentRepository.count({
            where: {
              user_id: userId,
              created_at: Between(today, tomorrow),
            },
          });

          if (count >= 2) {
            throw new HttpException('FREE_TIER_DAILY_LIMIT_REACHED', HttpStatus.FORBIDDEN);
          }
        }
      }

      const prompt = CONTENT_GENERATOR_PROMPT.user
        .replace('{{topic}}', topic)
        .replace('{{content_type}}', type || '시사/일반')
        .replace('{{difficulty}}', 'Medium');

      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: CONTENT_GENERATOR_PROMPT.system },
          { role: 'user', content: prompt }
        ],
        model: 'gpt-4o',
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      // Save Content
      const content = this.contentRepository.create({
        title: result.title || `${topic} Analysis`,
        topic: topic,
        body: result.body,
        difficulty: ((result.difficulty || 'MEDIUM') as string).toUpperCase() as ContentDifficulty,
        editor: 'Think7 AI',
        estimated_time: result.estimated_time || 7,
        published_date: new Date().toISOString().split('T')[0],
        thumbnail_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', // Placeholder
        user_id: userId as string,
        is_premium: false,
      });
      const savedContent = await this.contentRepository.save(content);

      // Save Questions
      if (result.questions && Array.isArray(result.questions)) {
        for (const q of result.questions) {
          const question = this.questionRepository.create({
            content: savedContent,
            type: QuestionType.MULTIPLE_CHOICE,
            question_text: q.question,
            options: q.options || [],
            correct_answer: q.correct_answer,
            ideal_answer: q.ideal_answer,
            keywords: q.keywords,
            scoring_criteria: q.scoring_criteria,
            order: q.order,
          });
          await this.questionRepository.save(question);
        }
      }

      return this.findOne(savedContent.id) as Promise<Content>;

    } catch (error) {
      console.error('Content Generation Error:', error);
      throw new HttpException('Failed to generate content', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string): Promise<void> {
    await this.questionRepository.delete({ content_id: id });
    await this.contentRepository.delete(id);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Seoul' })
  async handleDailyContentGeneration() {
    this.logger.log('Starting daily content generation cron job...');
    const topics = [
      '기술이 인간 소외에 미치는 영향',
      '플랫폼 기업의 독점과 공정성',
      'AI 시대의 저작권 문제',
      '현대 사회의 정보 격차 심화',
      '기후 변화와 기업의 사회적 책임',
      '소셜 미디어 알고리즘과 확증 편향',
      '저출산 고령화 사회의 경제적 파급 효과'
    ];
    // Select a random topic
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    try {
      await this.generateContent(randomTopic, null);
      this.logger.log(`Successfully generated daily content for topic: ${randomTopic}`);
    } catch (error) {
      this.logger.error(`Failed to generate daily content for topic: ${randomTopic}`, error);
    }
  }
}
