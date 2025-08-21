import express from 'express';
import { body } from 'express-validator';
import { login, register, verifyToken, verifyEmail } from '../controllers/authController.js';

const router = express.Router();

// Login route
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], login);

// Register route
router.post('/register', [
    body('name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('phone')
        .optional()
        .isMobilePhone('id-ID')
        .withMessage('Please provide a valid Indonesian phone number'),
    body('gender')
        .optional()
        .isIn(['Laki-laki', 'Perempuan'])
        .withMessage('Gender must be either Laki-laki or Perempuan')
], register);

// Verify token route
router.get('/verify', verifyToken);

// Email verification route
router.get('/verifikasi-email', verifyEmail);

export default router;