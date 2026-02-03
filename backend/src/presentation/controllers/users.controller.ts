import {
  Controller,
  Put,
  Body,
  Param,
  UseGuards,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateUserUseCase } from '../../core/use-cases/user/update-user.use-case';
import { SearchUsersUseCase } from '../../core/use-cases/user/search-users.use-case';
import { FindUserByIdUseCase } from '../../core/use-cases/user/find-user-by-id.use-case';
import { UpdateUserDto } from '../../core/dtos/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
  ) {}

  @Get('search')
  async search(@Query('q') query: string) {
    const users = await this.searchUsersUseCase.execute(query);
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      bio: u.bio,
    }));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<UpdateUserDto>) {
    const dto: UpdateUserDto = {
      userId: id,
      ...body,
    };
    const user = await this.updateUserUseCase.execute(dto);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.findUserByIdUseCase.execute(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
      publicKey: user.publicKey ?? undefined,
    };
  }
}
