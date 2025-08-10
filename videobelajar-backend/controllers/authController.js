import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

// Generate JWT token
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Login controller
export const login = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check hardcoded accounts first (for backward compatibility)
        if (email === "admin@videobelajar.com" && password === "admin123") {
            const token = generateToken('admin', email, 'admin');
            return res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: 'admin',
                        name: 'Administrator',
                        email: email,
                        role: 'admin'
                    },
                    token
                }
            });
        }

        if (email === "user@example.com" && password === "123456") {
            const token = generateToken('demo', email, 'user');
            return res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: 'demo',
                        name: 'Demo User',
                        email: email,
                        role: 'user'
                    },
                    token
                }
            });
        }

        // Check database users
        const query = 'SELECT * FROM users WHERE email = ?';
        const users = await executeQuery(query, [email]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        const user = users[0];

        // For database users, check if password is hashed or plain text
        let isPasswordValid = false;
        
        if (user.password.startsWith('$2')) {
            // Password is hashed
            isPasswordValid = await bcrypt.compare(password, user.password);
        } else {
            // Password is plain text (for backward compatibility)
            isPasswordValid = password === user.password;
        }

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        // Generate token
        const token = generateToken(user.id, user.email, user.role);

        // Return user data without password
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            role: user.role || 'user',
            avatar: user.avatar
        };

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userData,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat login'
        });
    }
};

// Register controller
export const register = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password, phone, gender } = req.body;

        // Check if email already exists
        const existingUserQuery = 'SELECT id FROM users WHERE email = ?';
        const existingUsers = await executeQuery(existingUserQuery, [email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email sudah terdaftar. Silakan gunakan email lain.'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate random avatar
        const avatarId = Math.floor(Math.random() * 100) + 1;
        const avatar = `https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/male/512/${avatarId}.jpg`;

        // Insert new user
        const insertQuery = `
            INSERT INTO users (name, email, password, phone, gender, role, avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await executeQuery(insertQuery, [
            name,
            email,
            hashedPassword,
            phone || null,
            gender || null,
            'student', // Default role
            avatar
        ]);

        // Get the created user
        const newUserQuery = 'SELECT * FROM users WHERE id = ?';
        const newUsers = await executeQuery(newUserQuery, [result.insertId]);
        const newUser = newUsers[0];

        // Return user data without password
        const userData = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            gender: newUser.gender,
            role: newUser.role,
            avatar: newUser.avatar
        };

        res.status(201).json({
            success: true,
            message: 'Pendaftaran berhasil',
            data: userData
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.'
        });
    }
};

// Verify token controller
export const verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const query = 'SELECT * FROM users WHERE id = ?';
        const users = await executeQuery(query, [decoded.userId]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        const user = users[0];
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            role: user.role,
            avatar: user.avatar
        };

        res.json({
            success: true,
            message: 'Token valid',
            data: userData
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Token tidak valid'
        });
    }
};