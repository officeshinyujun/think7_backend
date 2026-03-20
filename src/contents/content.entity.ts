import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Question } from '../questions/question.entity';
import { User } from '../users/user.entity';

export enum ContentDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity()
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  topic: string;

  @Column('text')
  body: string;

  @Column({
    type: 'enum',
    enum: ContentDifficulty,
  })
  difficulty: ContentDifficulty;

  @Column()
  editor: string;

  @Column({ nullable: true })
  thumbnail_image: string;

  @Column('int')
  estimated_time: number;

  @Column({ default: false })
  is_premium: boolean;

  @Column({ type: 'date' })
  published_date: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Question, (question: Question) => question.content)
  questions: Question[];
}
