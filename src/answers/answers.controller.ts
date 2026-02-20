import { Controller, Get, Post, Body } from '@nestjs/common';
import { AnswersService } from './answers.service';
import { Answer } from './answer.entity';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post()
  create(@Body() createAnswerDto: Partial<Answer>): Promise<Answer> {
    return this.answersService.create(createAnswerDto);
  }

  @Get()
  findAll(): Promise<Answer[]> {
    return this.answersService.findAll();
  }
}
