module.exports = {
  secret: process.env.JWT_SECRET || 'fallback_change_in_production',
  expiresIn: '7d',
  cookieName: 'tf_token',
  cookieOptions: () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  }),
};
