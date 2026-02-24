import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ status: 'ok' });

  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set('session', '', {
    httpOnly: true,
    secure: isProd,
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
  });

  response.cookies.set('role', '', {
    httpOnly: false,
    secure: isProd,
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
  });

  return response;
}


