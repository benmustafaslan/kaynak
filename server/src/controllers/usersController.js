import User from '../models/User.js';

export const list = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('name email role')
      .sort({ name: 1 })
      .lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
};
