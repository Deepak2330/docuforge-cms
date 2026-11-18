'use server';

import { cookies } from 'next/headers';
import { api, ApiError } from './api';
import type { User, LoginResponse, AuthTokens } from '@/types';

const ACCESS_TOKEN_KEY = 'docuforge_access_token';
const REFRESH_TOKEN_KEY = 'docuforge_refresh_token';
const USER_KEY = 'docuforge_user';

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_KEY)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_KEY)?.value ?? null;
}

export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userJson = cookieStore.get(USER_KEY)?.value;
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

export async function setAuthCookies(user: User, tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(ACCESS_TOKEN_KEY, tokens.accessToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: tokens.expiresIn,
    path: '/',
  });

  cookieStore.set(REFRESH_TOKEN_KEY, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  cookieStore.set(USER_KEY, JSON.stringify(user), {
    httpOnly: false, // accessible by client for display
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_KEY);
  cookieStore.delete(REFRESH_TOKEN_KEY);
  cookieStore.delete(USER_KEY);
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tokens = await api.post<AuthTokens>('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });

    // After register, login to get user data
    const loginResult = await api.post<LoginResponse>('/auth/login', { email, password });
    await setAuthCookies(loginResult.user, loginResult.tokens);

    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await api.post<LoginResponse>('/auth/login', { email, password });
    await setAuthCookies(result.user, result.tokens);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

export async function logout(): Promise<void> {
  try {
    const token = await getAccessToken();
    const refreshToken = await getRefreshToken();
    if (token) {
      await api.post('/auth/logout', { refreshToken }, token);
    }
  } catch {
    // Ignore logout errors
  } finally {
    await clearAuthCookies();
  }
}

export async function refreshSession(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    const tokens = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
    const user = await getUser();
    if (user) {
      await setAuthCookies(user, tokens);
    }
    return true;
  } catch {
    await clearAuthCookies();
    return false;
  }
}
