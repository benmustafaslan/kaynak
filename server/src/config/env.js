const port = parseInt(process.env.PORT || '3000', 10);
const nodeEnv = process.env.NODE_ENV || 'development';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production. Set it in your environment.');
}
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

export const env = {
  port,
  nodeEnv,
  clientUrl,
  jwt: {
    secret: jwtSecret,
    expiresIn: jwtExpiresIn,
  },
};
