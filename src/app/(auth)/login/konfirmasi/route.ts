import { type NextRequest, NextResponse } from 'next/server';

import { tujuanSetelahLogin } from '@/lib/auth/next-path';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const tujuan = tujuanSetelahLogin(searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(tujuan, request.url));
  }

  return NextResponse.redirect(new URL('/login/lupa?status=kedaluwarsa', request.url));
}
