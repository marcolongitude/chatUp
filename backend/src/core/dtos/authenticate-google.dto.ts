import { AuthenticationResult } from './authenticate-user.dto';

export class AuthenticateGoogleDto {
  idToken: string;
}

export type AuthenticateGoogleResult = AuthenticationResult;
