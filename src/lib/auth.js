import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token from Request headers
 * @param {Request} request - Next.js Request object
 * @returns {Object|null} Decoded user token payload or null if invalid
 */
export const verifyAuth = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error('Auth verification error:', err.message);
    return null;
  }
};
