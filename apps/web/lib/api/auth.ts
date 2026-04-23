import { API_BASE } from "./client";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  data: T;
}

export async function loginApi(body: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "로그인에 실패했습니다" }));
    throw new Error(error.detail ?? "로그인에 실패했습니다");
  }

  const json: ApiResponse<TokenResponse> = await res.json();
  return json.data;
}

export async function registerApi(body: RegisterRequest): Promise<UserResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "회원가입에 실패했습니다" }));
    throw new Error(error.detail ?? "회원가입에 실패했습니다");
  }

  const json: ApiResponse<UserResponse> = await res.json();
  return json.data;
}

export async function fetchCurrentUser(accessToken: string): Promise<UserResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("사용자 정보를 가져올 수 없습니다");
  }

  const json: ApiResponse<UserResponse> = await res.json();
  return json.data;
}

export type { LoginRequest, RegisterRequest, TokenResponse, UserResponse };
