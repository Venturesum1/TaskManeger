import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import nodemailer from 'nodemailer';

async function sendUpdateEmails(meeting: any) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const dateFormatted = new Date(meeting.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const meetLink = meeting.googleMeetLink || '';

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;background:#F9FAFB;margin:0;padding:24px">
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:32px;max-width:520px;margin:0 auto">
        <p style="font-size:12px;color:#6B7280;margin-bottom:16px;letter-spacing:0.05em">MEETING UPDATE · TASKFLOW</p>
        <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 20px">📅 Meeting Updated</h2>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 10px">${meeting.title}</p>
          <p style="font-size:13px;color:#6B7280;margin:0 0 4px">📅 ${dateFormatted}</p>
          <p style="font-size:13px;color:#6B7280;margin:0 0 8px">🕐 ${meeting.startTime} – ${meeting.endTime}</p>
          ${meetLink ? `<p style="font-size:13px;margin:0">🎥 <a href="${meetLink}" style="color:#6366F1;font-weight:500">${meetLink}</a></p>` : ''}
        </div>
        ${meetLink
          ? `<a href="${meetLink}" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Join Google Meet</a>`
          : `<a href="${process.env.NEXT_PUBLIC_APP_URL}/meetings" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Meeting</a>`
        }
      </div>
    </div>`;

  const participants = meeting.participants || [];
  for (const p of participants) {
    const email = typeof p === 'object' ? p.email : null;
    if (!email) continue;
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `B4Utaskmanagement <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Meeting Updated: ${meeting.title}`,
        html,
      });
    } catch (err: any) {
      console.error('[Email]', email, err.message);
    }
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const updates = await req.json();
    const meeting = await Meeting.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true }
    )
      .populate('participants', 'name email phone')
      .populate('organizer', 'name email')
      .lean();

    if (!meeting) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Auto-send update emails to all participants
    sendUpdateEmails(meeting).catch(console.error);

    return NextResponse.json({ success: true, data: meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    await Meeting.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Meeting deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
