import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOrCreateUser(
    firebaseUid: string,
    email: string,
    displayName?: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({ where: { firebaseUid } });

    if (!user) {
      this.logger.log(`Creating new user with firebaseUid: ${firebaseUid}`);
      user = this.userRepository.create({
        firebaseUid,
        email,
        displayName,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
