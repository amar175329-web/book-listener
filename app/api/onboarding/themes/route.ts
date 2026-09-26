import { NextResponse } from 'next/server';
import { THEMES } from '@/lib/i18n';

export async function GET() {
  return NextResponse.json({ themes: THEMES });
}
