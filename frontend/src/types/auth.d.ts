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
