export interface RegisterDTO {
  email: string;
  name: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface JWTPayload {
  id: string;      // Alias for userId for convenience
  userId: string;
  email: string;
}
