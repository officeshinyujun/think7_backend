import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Content } from '../contents/content.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SUBJECTIVE = 'SUBJECTIVE',
}

@Entity()
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content_id: string;

  @ManyToOne(() => Content, (content) => content.questions)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @Column('text')
  question_text: string;

  @Column('simple-json', { nullable: true })
  options: string[];

  @Column({ nullable: true })
  correct_answer: string;

  @Column({ nullable: true })
  ideal_answer: string;

  @Column('simple-json', { nullable: true })
  keywords: string[];

  @Column({ nullable: true })
  scoring_criteria: string;

  @Column({ nullable: true })
  order: number;
}
