// middleware/adminAuth.js (New backend middleware for admin auth)
import jwt from 'jsonwebtoken';

export const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};