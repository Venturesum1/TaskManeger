import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { signToken, cookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role as 'admin' | 'member',
      name: user.name,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
      },
    });

    const opts = cookieOptions();
    res.cookies.set(opts.name, token, opts);
    return res;
  } catch (err: any) {
    console.error('[login]', err.message);
    return NextResponse.json(
      { success: false, error: `Server error: ${err.message}` },
      { status: 500 }
    );
  }
}
