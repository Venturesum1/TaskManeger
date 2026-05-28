import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { createGoogleMeetLink } from '@/lib/googleMeet';
import nodemailer from 'nodemailer';

async function sendMeetingEmails(
  participants: any[],
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  meetLink: string,
  subject: string
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;background:#F9FAFB;margin:0;padding:24px">
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:32px;max-width:520px;margin:0 auto">
        <p style="font-size:12px;color:#6B7280;margin-bottom:16px;letter-spacing:0.05em">MEETING INVITE · TASKFLOW</p>
        <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 20px">📅 ${subject}</h2>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 10px">${title}</p>
          <p style="font-size:13px;color:#6B7280;margin:0 0 4px">📅 ${dateFormatted}</p>
          <p style="font-size:13px;color:#6B7280;margin:0 0 8px">🕐 ${startTime} – ${endTime}</p>
          ${meetLink ? `<p style="font-size:13px;margin:0">🎥 <a href="${meetLink}" style="color:#6366F1;font-weight:500">${meetLink}</a></p>` : ''}
        </div>
        ${meetLink
          ? `<a href="${meetLink}" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Join Google Meet</a>`
          : `<a href="${process.env.NEXT_PUBLIC_APP_URL}/meetings" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Meeting</a>`
        }
      </div>
    </div>`;

  // Collect participant emails + organizer email (deduplicated)
  const emailSet = new Set<string>();
  participants.forEach((p: any) => { if (typeof p === 'object' && p.email) emailSet.add(p.email); });
  if (process.env.ADMIN_EMAIL) emailSet.add(process.env.ADMIN_EMAIL);
  const emails = Array.from(emailSet);

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `TaskFlow <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
    } catch (err: any) {
      console.error('[Email]', email, err.message);
    }
  }
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const meetings = await Meeting.find()
      .populate('participants', 'name email phone')
      .populate('organizer', 'name email')
      .sort({ date: 1 })
      .lean();
    return NextResponse.json({ success: true, data: meetings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const { title, description, date, startTime, endTime, participants } = await req.json();

    if (!title?.trim() || !date || !startTime || !endTime)
      return NextResponse.json({ success: false, error: 'Title, date, start and end time required' }, { status: 400 });

    let meetLink = '';
    let meetError = '';
    try {
      meetLink = await createGoogleMeetLink(title.trim(), date.split('T')[0], startTime, endTime);
      console.log('[Google Meet] Link created:', meetLink);
    } catch (err: any) {
      meetError = err.message;
      console.error('[Google Meet] FAILED:', err.message);
    }

    const meeting = await Meeting.create({
      title: title.trim(), description, date, startTime, endTime,
      participants: participants || [],
      googleMeetLink: meetLink,
      organizer: auth.userId,
    });

    await meeting.populate([
      { path: 'participants', select: 'name email phone' },
      { path: 'organizer', select: 'name email' },
    ]);

    // Auto-send invite emails to all participants
    sendMeetingEmails(
      meeting.participants as any[],
      meeting.title, date, startTime, endTime, meetLink,
      `Meeting Invite: ${meeting.title}`
    ).catch(console.error);

    return NextResponse.json({ success: true, data: meeting, meetError: meetError || undefined }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
