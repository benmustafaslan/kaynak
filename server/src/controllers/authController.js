import jwt from 'jsonwebtoken';
import validator from 'validator';
import User from '../models/User.js';
import { env } from '../config/env.js';

const createToken = (userId) =>
  jwt.sign({ userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const emailClean = validator.normalizeEmail(validator.trim(email));
    if (!validator.isEmail(emailClean)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const nameClean = validator.escape(validator.trim(name)).slice(0, 200);
    if (!nameClean) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await User.findOne({ email: emailClean });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      email: emailClean,
      password,
      name: nameClean,
    });

    const token = createToken(user._id);
    res.cookie('token', token, cookieOptions);

    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(201).json({ user: userResponse, token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailClean = validator.normalizeEmail(validator.trim(email));
    const user = await User.findOne({ email: emailClean }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user._id);
    res.cookie('token', token, cookieOptions);

    const userResponse = user.toObject();
    delete userResponse.password;
    res.json({ user: userResponse, token });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
  res.json({ message: 'Logged out' });
};

export const me = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};
