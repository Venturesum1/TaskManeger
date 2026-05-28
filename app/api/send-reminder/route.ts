import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function buildReminderHTML(type: string, data: Record<string, string>) {
  const styles = `
    body { font-family: Inter, system-ui, sans-serif; background: #F9FAFB; margin: 0; padding: 24px; }
    .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 32px; max-width: 520px; margin: 0 auto; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
    .btn { display: inline-block; background: #6366F1; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  `;

  if (type === 'task_due') {
    return `<style>${styles}</style>
    <div class="card">
      <p style="font-size:12px;color:#6B7280;margin-bottom:16px">TASK REMINDER · TASKFLOW</p>
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">⏰ Task Due Reminder</h2>
      <p style="color:#6B7280;margin:0 0 20px">This task is due soon.</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px">${data.taskTitle}</p>
        <p style="font-size:13px;color:#6B7280;margin:0">Owner: ${data.ownerName} · Due: ${data.dueDate}</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks" class="btn">View Task</a>
    </div>`;
  }

  if (type === 'meeting_reminder') {
    return `<style>${styles}</style>
    <div class="card">
      <p style="font-size:12px;color:#6B7280;margin-bottom:16px">MEETING REMINDER · TASKFLOW</p>
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">📅 Meeting Reminder</h2>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px">${data.title}</p>
        <p style="font-size:13px;color:#6B7280;margin:0 0 4px">📅 ${data.date} · ${data.startTime} – ${data.endTime}</p>
        ${data.meetLink ? `<p style="font-size:13px;color:#6B7280;margin:4px 0">🎥 <a href="${data.meetLink}" style="color:#6366F1">${data.meetLink}</a></p>` : ''}
      </div>
      ${data.meetLink ? `<a href="${data.meetLink}" class="btn">Join Google Meet</a>` : ''}
    </div>`;
  }

  return `<style>${styles}</style><div class="card"><p>${data.message || 'You have a new notification from TaskFlow.'}</p></div>`;
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { type, to, subject, data } = await req.json();

    if (!to || !subject) {
      return NextResponse.json({ success: false, error: 'Recipient and subject required' }, { status: 400 });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({
        success: false,
        error: 'Email not configured. Set EMAIL_USER and EMAIL_PASS in .env',
      }, { status: 503 });
    }

    const transporter = createTransport();
    const html = buildReminderHTML(type, data || {});

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `TaskFlow <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true, message: 'Reminder sent' });
  } catch (error: any) {
    console.error('Email error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
