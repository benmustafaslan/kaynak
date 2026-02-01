import validator from 'validator';

const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return '';
  return validator.escape(validator.trim(str)).slice(0, maxLength);
};

/** Keys that must not be escaped (e.g. script content is intentional HTML). */
const SKIP_SANITIZE_KEYS = new Set(['content']);

export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (SKIP_SANITIZE_KEYS.has(key)) continue;
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key], 10000);
      }
    }
  }
  next();
};

export { sanitizeString };
