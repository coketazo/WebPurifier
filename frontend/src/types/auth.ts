// 인증 관련 타입 정의 (백엔드 스키마와 동일하게 유지)
export interface SignupRequest {
  username: string;
  password: string;
}

export interface SignupResponse {
  id: number;
  username: string;
  access_token: string;
  token_type: string;
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  access_token: string;
  token_type: string;
  message: string;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
}
