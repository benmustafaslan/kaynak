import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const inviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many invite attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
