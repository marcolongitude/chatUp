import { IUserRepository } from '../../interfaces/user.repository.interface';
import { User } from '../../entities/user.entity';

export class FindUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    return user;
  }
}
