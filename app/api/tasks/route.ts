import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/lib/models/Task';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const owner = searchParams.get('owner');
    const search = searchParams.get('search');
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (owner && owner !== 'all') query.owner = owner;
    if (search) query.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .populate('owner', 'name email department phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: tasks });
  } catch (err: any) {
    console.error('[GET /api/tasks]', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const { title, description, owner, priority, status, startDate, endDate, milestone } = await req.json();

    if (!title?.trim() || !owner)
      return NextResponse.json({ success: false, error: 'Title and owner are required' }, { status: 400 });

    const task = await Task.create({
      title: title.trim(), description, owner,
      priority: priority || 'medium',
      status: status || 'not_started',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      milestone,
      createdBy: auth.userId,
    });

    const populated = await task.populate('owner', 'name email department phone');
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/tasks]', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
