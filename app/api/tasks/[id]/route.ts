import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/lib/models/Task';
import { getAuthUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const task = await Task.findById(params.id)
      .populate('owner', 'name email department phone')
      .populate('createdBy', 'name email')
      .lean();
    if (!task) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: task });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const updates = await req.json();
    const task = await Task.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email department phone')
      .lean();

    if (!task) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: task });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const task = await Task.findByIdAndDelete(params.id);
    if (!task) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
