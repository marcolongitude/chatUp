import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  GoogleTokenPayload,
  IGoogleTokenVerifier,
} from '../../core/interfaces/google-token-verifier.interface';

@Injectable()
export class GoogleIdTokenVerifier implements IGoogleTokenVerifier {
  private readonly client: OAuth2Client;
  private readonly clientId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<GoogleTokenPayload> {
    if (!this.clientId) {
      throw new Error('Google client ID not configured');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new Error('Invalid Google token payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }
}
