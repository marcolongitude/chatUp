export interface GoogleTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface IGoogleTokenVerifier {
  verify(idToken: string): Promise<GoogleTokenPayload>;
}
