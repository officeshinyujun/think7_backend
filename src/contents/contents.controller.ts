import { Controller, Get, Post, Body, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { Content } from './content.entity';

@Controller('content')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Post('generate')
  generate(@Body() body: { topic: string, type?: string }): Promise<Content> {
    return this.contentsService.generateContent(body.topic, body.type);
  }

  @Post()
  create(@Body() createContentDto: Partial<Content>): Promise<Content> {
    return this.contentsService.create(createContentDto);
  }

  @Get('today')
  findToday(): Promise<Content | null> {
    return this.contentsService.findToday();
  }

  @Get('library')
  findLibrary(@Query('topic') topic?: string): Promise<Content[]> {
    return this.contentsService.findLibrary(topic);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Content | null> {
    return this.contentsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.contentsService.remove(id);
  }
}
