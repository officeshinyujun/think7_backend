import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class CoachSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  analysis_id: string;

  @Column()
  question_number: number;

  @Column({ nullable: true })
  question_text: string;

  @Column('simple-json')
  messages: { role: string; content: string }[];

  @CreateDateColumn()
  created_at: Date;
}
