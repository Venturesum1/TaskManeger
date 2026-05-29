const googleConfig = require('../config/google');
const logger = require('../utils/logger');

async function getAccessToken() {
  const { clientId, clientSecret, refreshToken, tokenUrl } = googleConfig;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN missing)');
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Google token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function createCalendarEvent({ title, date, startTime, endTime }) {
  const accessToken = await getAccessToken();
  const { calendarApiUrl, timeZone } = googleConfig;

  const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];

  const body = {
    summary: title,
    start: { dateTime: `${dateStr}T${startTime}:00`, timeZone },
    end: { dateTime: `${dateStr}T${endTime}:00`, timeZone },
    conferenceData: {
      createRequest: {
        requestId: `tf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const res = await fetch(`${calendarApiUrl}?conferenceDataVersion=1`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Calendar API error: ${JSON.stringify(data.error || data)}`);
  }

  const meetLink = data.conferenceData?.entryPoints?.[0]?.uri;
  if (!meetLink) throw new Error('No Google Meet link returned from Calendar API');

  logger.info('[GoogleMeet] Event created', { title, meetLink });
  return { meetLink, eventId: data.id };
}

async function createGoogleMeet({ title, date, startTime, endTime }) {
  try {
    const result = await createCalendarEvent({ title, date, startTime, endTime });
    return result.meetLink;
  } catch (err) {
    logger.error('[GoogleMeet] Failed to create meet link', { title, error: err.message });
    throw err;
  }
}

module.exports = { createGoogleMeet, createCalendarEvent };
