import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum UserSubscription {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  hashed_password: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.EMAIL,
  })
  auth_provider: AuthProvider;

  @Column({
    type: 'enum',
    enum: UserSubscription,
    default: UserSubscription.FREE,
  })
  subscription_plan: UserSubscription;

  @Column({ type: 'timestamp', nullable: true })
  subscription_expires_at: Date;

  @Column({ nullable: true })
  profile_image: string;

  @CreateDateColumn()
  created_at: Date;
}
