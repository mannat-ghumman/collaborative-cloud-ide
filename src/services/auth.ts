import { API_BASE_URL } from "../config";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Login failed"
    );
  }

  localStorage.setItem(
    "cloudide_token",
    data.token
  );

  return data;
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Registration failed"
    );
  }


  return data;
}

export async function getCurrentUser(): Promise<User> {
  const token =
    localStorage.getItem(
      "cloudide_token"
    );

  if (!token) {
    throw new Error(
      "No authentication token"
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to get current user"
    );
  }

  return data.user;
}

export function logout() {
  localStorage.removeItem(
    "cloudide_token"
  );
}

export function getToken() {
  return localStorage.getItem(
    "cloudide_token"
  );
}