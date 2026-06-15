'use server';

import { cookies } from 'next/headers';

const ADMIN_TOKEN_STORAGE_KEY = 'diu_lens_admin_access_token';

export async function storeAdminTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_TOKEN_STORAGE_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  });
}

export async function readAdminTokenCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_TOKEN_STORAGE_KEY)?.value || null;
}

export async function clearAdminTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_TOKEN_STORAGE_KEY);
}
