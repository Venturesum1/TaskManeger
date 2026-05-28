import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, signToken, cookieOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const user = await User.findById(auth.userId).select('-password').lean();
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, password, role, department, phone } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json({ success: false, error: 'Name, email, password required' }, { status: 400 });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });

    const user = await User.create({ name, email, password, role: role || 'member', department, phone });
    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role as 'admin' | 'member', name: user.name });
    const res = NextResponse.json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
    const opts = cookieOptions();
    res.cookies.set(opts.name, token, opts);
    return res;
  } catch (err: any) {
    if (err.code === 11000) return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
