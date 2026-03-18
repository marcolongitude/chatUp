import { IUserRepository } from '../../interfaces/user.repository.interface';
import { ITokenService } from '../../interfaces/token-service.interface';
import { User } from '../../entities/user.entity';
import {
  AuthenticateGoogleDto,
  AuthenticateGoogleResult,
} from '../../dtos/authenticate-google.dto';
import { IGoogleTokenVerifier } from '../../interfaces/google-token-verifier.interface';

export class AuthenticateGoogleUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly googleTokenVerifier: IGoogleTokenVerifier,
  ) {}

  async execute(dto: AuthenticateGoogleDto): Promise<AuthenticateGoogleResult> {
    const googlePayload = await this.googleTokenVerifier.verify(dto.idToken);

    const existingByGoogleId = await this.userRepository.findByGoogleId(
      googlePayload.sub,
    );

    if (existingByGoogleId) {
      return this.buildAuthResult(existingByGoogleId);
    }

    const existingByEmail = await this.userRepository.findByEmail(
      googlePayload.email,
    );

    if (existingByEmail) {
      const updatedUser = await this.userRepository.update(
        new User({
          ...existingByEmail,
          googleId: existingByEmail.googleId || googlePayload.sub,
          photoURL: existingByEmail.photoURL || googlePayload.picture,
          displayName: existingByEmail.displayName || googlePayload.name,
          updatedAt: new Date(),
        }),
      );

      return this.buildAuthResult(updatedUser);
    }

    const newUser = new User({
      id: undefined,
      email: googlePayload.email,
      passwordHash: null,
      googleId: googlePayload.sub,
      displayName: googlePayload.name,
      photoURL: googlePayload.picture,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdUser = await this.userRepository.create(newUser);
    return this.buildAuthResult(createdUser);
  }

  private async buildAuthResult(user: User): Promise<AuthenticateGoogleResult> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.tokenService.generateToken(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    };
  }
}
