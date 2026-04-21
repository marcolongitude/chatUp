import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from '../../infra/security/jwt.strategy';
import { AuthController } from '../controllers/auth.controller';
import { AuthenticateUserUseCase } from '../../core/use-cases/auth/authenticate-user.use-case';
import { CreateUserUseCase } from '../../core/use-cases/user/create-user.use-case';
import { BcryptPasswordHasher } from '../../infra/security/bcrypt-password-hasher';
import { JwtTokenService } from '../../infra/security/jwt-token-service';
import { GoogleIdTokenVerifier } from '../../infra/security/google-id-token-verifier';
import { TypeOrmUserEntity } from '../../infra/database/entities/typeorm-user.entity';
import { TypeOrmUserRepository } from '../../infra/database/typeorm-user.repository';
import { AuthenticateGoogleUseCase } from '../../core/use-cases/auth/authenticate-google.use-case';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: 'SECRET_KEY_DEV', // TODO: Move to Env
      signOptions: { expiresIn: '60m' },
    }),
    TypeOrmModule.forFeature([TypeOrmUserEntity]),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: 'IUserRepository',
      useClass: TypeOrmUserRepository,
    },
    {
      provide: 'IPasswordHasher',
      useClass: BcryptPasswordHasher,
    },
    {
      provide: 'ITokenService',
      useClass: JwtTokenService,
    },
    {
      provide: 'IGoogleTokenVerifier',
      useClass: GoogleIdTokenVerifier,
    },
    {
      provide: AuthenticateUserUseCase,
      useFactory: (repo, hasher, token) =>
        new AuthenticateUserUseCase(repo, hasher, token),
      inject: ['IUserRepository', 'IPasswordHasher', 'ITokenService'],
    },
    {
      provide: AuthenticateGoogleUseCase,
      useFactory: (repo, token, googleVerifier) =>
        new AuthenticateGoogleUseCase(repo, token, googleVerifier),
      inject: ['IUserRepository', 'ITokenService', 'IGoogleTokenVerifier'],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (repo, hasher) => new CreateUserUseCase(repo, hasher),
      inject: ['IUserRepository', 'IPasswordHasher'],
    },
  ],
})
export class AuthModule {}
