import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Read from runtime env (not NEXT_PUBLIC_ prefixed to avoid build-time replacement)
  const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8005/api/v1';
  const apiToken = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || '';
  
  return NextResponse.json({
    apiBaseUrl,
    apiToken,
  });
}

