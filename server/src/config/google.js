module.exports = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  calendarApiUrl: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  timeZone: 'Asia/Kolkata',
};
