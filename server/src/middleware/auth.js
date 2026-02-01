import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next();
    }
    next(err);
  }
};
