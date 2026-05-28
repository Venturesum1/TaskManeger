async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export async function createGoogleMeetLink(
  title: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<string> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google credentials not set in .env');
  }

  const accessToken = await getAccessToken();

  const body = {
    summary: title,
    start: { dateTime: `${date}T${startTime}:00`, timeZone: 'Asia/Kolkata' },
    end: { dateTime: `${date}T${endTime}:00`, timeZone: 'Asia/Kolkata' },
    conferenceData: {
      createRequest: {
        requestId: `tf-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Calendar API error: ${JSON.stringify(data.error || data)}`);
  }

  const link = data.conferenceData?.entryPoints?.[0]?.uri;
  if (!link) throw new Error(`No Meet link returned. Response: ${JSON.stringify(data.conferenceData)}`);
  return link;
}
