import validator from 'validator';

const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return '';
  return validator.escape(validator.trim(str)).slice(0, maxLength);
};

export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key], 10000);
      }
    }
  }
  next();
};

export { sanitizeString };
