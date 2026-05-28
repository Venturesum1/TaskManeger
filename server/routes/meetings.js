const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
require('../models/User');
const { connectDB } = require('../lib/db');
const { getAuthUser } = require('../lib/auth');
const { createGoogleMeetLink } = require('../lib/googleMeet');
const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendMeetingEmails(participants, title, date, startTime, endTime, meetLink, subject) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const transporter = createTransport();
  const dateFormatted = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;background:#F9FAFB;margin:0;padding:24px">
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:32px;max-width:520px;margin:0 auto">
        <p style="font-size:12px;color:#6B7280;margin-bottom:16px">MEETING INVITE · B4UTASKMANAGEMENT</p>
        <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 20px">📅 ${subject}</h2>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 10px">${title}</p>
          <p style="font-size:13px;color:#6B7280;margin:0 0 4px">📅 ${dateFormatted}</p>
          <p style="font-size:13px;color:#6B7280;margin:0 0 8px">🕐 ${startTime} – ${endTime}</p>
          ${meetLink ? `<p style="font-size:13px;margin:0">🎥 <a href="${meetLink}" style="color:#6366F1">${meetLink}</a></p>` : ''}
        </div>
        ${meetLink
          ? `<a href="${meetLink}" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Join Google Meet</a>`
          : `<a href="${process.env.FRONTEND_URL || '#'}/meetings" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Meeting</a>`
        }
      </div>
    </div>`;

  const emailSet = new Set();
  participants.forEach(p => { if (p?.email) emailSet.add(p.email); });
  if (process.env.ADMIN_EMAIL) emailSet.add(process.env.ADMIN_EMAIL);

  for (const email of emailSet) {
    try {
      await transporter.sendMail({ from: process.env.EMAIL_FROM || `B4Utaskmanagement <${process.env.EMAIL_USER}>`, to: email, subject, html });
    } catch (err) {
      console.error('[Email]', email, err.message);
    }
  }
}

router.get('/', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const meetings = await Meeting.find()
      .populate('participants', 'name email phone')
      .populate('organizer', 'name email')
      .sort({ date: 1 }).lean();
    res.json({ success: true, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const { title, description, date, startTime, endTime, participants } = req.body;
    if (!title?.trim() || !date || !startTime || !endTime)
      return res.status(400).json({ success: false, error: 'Title, date, start and end time required' });

    let meetLink = '';
    try {
      meetLink = await createGoogleMeetLink(title.trim(), date.split('T')[0], startTime, endTime);
      console.log('[Google Meet] Created:', meetLink);
    } catch (err) {
      console.error('[Google Meet] FAILED:', err.message);
    }

    const meeting = await Meeting.create({
      title: title.trim(), description, date, startTime, endTime,
      participants: participants || [], googleMeetLink: meetLink, organizer: auth.userId,
    });

    await meeting.populate([
      { path: 'participants', select: 'name email phone' },
      { path: 'organizer', select: 'name email' },
    ]);

    sendMeetingEmails(meeting.participants, meeting.title, date, startTime, endTime, meetLink, `Meeting Invite: ${meeting.title}`).catch(console.error);

    res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
      .populate('participants', 'name email phone')
      .populate('organizer', 'name email').lean();
    if (!meeting) return res.status(404).json({ success: false, error: 'Not found' });

    sendMeetingEmails(meeting.participants, meeting.title, meeting.date, meeting.startTime, meeting.endTime, meeting.googleMeetLink, `Meeting Updated: ${meeting.title}`).catch(console.error);

    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
