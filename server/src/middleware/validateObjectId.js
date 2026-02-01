/** 24 hex chars (MongoDB ObjectId string format). */
function isValidObjectIdString(id) {
  return typeof id === 'string' && id.trim().length === 24 && /^[a-fA-F0-9]{24}$/.test(id.trim());
}

/**
 * Middleware that validates req.params[paramName] is a valid MongoDB ObjectId.
 * Returns 400 if invalid. Use for routes like GET /stories/:id.
 */
export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !isValidObjectIdString(value)) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    next();
  };
}

export { isValidObjectIdString };
