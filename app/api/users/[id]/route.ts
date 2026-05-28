import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (auth.role !== 'admin' && auth.userId !== params.id)
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    await connectDB();
    const updates = await req.json();
    delete (updates as any).password;
    delete (updates as any).email;

    const user = await User.findByIdAndUpdate(params.id, { $set: updates }, { new: true })
      .select('-password')
      .lean();

    if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ success: false, error: 'Admin required' }, { status: 403 });

  try {
    await connectDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
