import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  const status: Record<string, unknown> = {
    app: 'TaskFlow v2',
    node: process.version,
    env: process.env.NODE_ENV,
    mongoUri: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':<hidden>@')
      : 'NOT SET — add MONGODB_URI to .env',
    jwtSecret: process.env.JWT_SECRET ? 'SET ✓' : 'NOT SET',
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.MONGODB_URI ? 'ACTIVE' : 'OFF',
  };

  try {
    await connectDB();
    status.database = 'CONNECTED ✅';
    status.dbHost = process.env.MONGODB_URI?.split('@')[1]?.split('/')[0] || 'unknown';
  } catch (err: any) {
    status.database = `FAILED ❌ — ${err.message}`;
    status.fix = err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')
      ? 'Check MongoDB Atlas: (1) Whitelist your IP in Network Access, (2) Verify credentials'
      : err.message.includes('authentication')
      ? 'Wrong username/password in MONGODB_URI'
      : 'Check your .env.local MONGODB_URI setting';
  }

  return NextResponse.json(status, { status: status.database === 'CONNECTED ✅' ? 200 : 503 });
}
