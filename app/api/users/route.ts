import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  try {
    await connectDB();
    const { name, email, password, role, department, phone } = await req.json();

    if (!name?.trim() || !email?.trim() || !password?.trim())
      return NextResponse.json({ success: false, error: 'Name, email, and password are required' }, { status: 400 });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });

    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role: role || 'member', department, phone });
    return NextResponse.json({
      success: true,
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department },
    }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
