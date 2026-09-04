export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'operator';
}

export interface AuthTokenPayload {
  sub: number;
  email: string;
  role: AuthUser['role'];
}
