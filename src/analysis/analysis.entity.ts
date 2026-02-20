import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  content_id: string;

  @Column({ type: 'date' })
  day: string;

  @Column('simple-json')
  summary: any;

  @Column('simple-json')
  dimension_scores: any;

  @Column('simple-json')
  thinking_type: any;

  @Column('simple-json')
  growth: any;

  @Column('simple-json')
  wrong_answer: any;

  @CreateDateColumn()
  created_at: Date;
}
