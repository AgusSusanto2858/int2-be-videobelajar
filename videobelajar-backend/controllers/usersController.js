import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const query = `
            SELECT id, name, email, phone, gender, role, avatar, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
        `;
        
        const users = await executeQuery(query);

        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: users,
            count: users.length
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data users'
        });
    }
};

// Get user by ID
export const getUserById = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        
        const query = `
            SELECT id, name, email, phone, gender, role, avatar, created_at, updated_at
            FROM users
            WHERE id = ?
        `;
        
        const users = await executeQuery(query, [id]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'User retrieved successfully',
            data: users[0]
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data user'
        });
    }
};

// Create new user
export const createUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password, phone, gender, role, avatar } = req.body;

        // Check if email already exists
        const existingUserQuery = 'SELECT id FROM users WHERE email = ?';
        const existingUsers = await executeQuery(existingUserQuery, [email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate default avatar if not provided
        const userAvatar = avatar || `https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/male/512/${Math.floor(Math.random() * 100)}.jpg`;

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
            role || 'student',
            userAvatar
        ]);

        // Get the created user
        const newUserQuery = `
            SELECT id, name, email, phone, gender, role, avatar, created_at, updated_at
            FROM users WHERE id = ?
        `;
        const newUsers = await executeQuery(newUserQuery, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUsers[0]
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat membuat user'
        });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { name, email, phone, gender, role, avatar } = req.body;

        // Check if user exists
        const existingUserQuery = 'SELECT * FROM users WHERE id = ?';
        const existingUsers = await executeQuery(existingUserQuery, [id]);

        if (existingUsers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Check if email is being changed and already exists
        if (email && email !== existingUsers[0].email) {
            const emailCheckQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
            const emailExists = await executeQuery(emailCheckQuery, [email, id]);

            if (emailExists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah digunakan oleh user lain'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (email !== undefined) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            updateValues.push(phone || null);
        }
        if (gender !== undefined) {
            updateFields.push('gender = ?');
            updateValues.push(gender || null);
        }
        if (role !== undefined) {
            updateFields.push('role = ?');
            updateValues.push(role);
        }
        if (avatar !== undefined) {
            updateFields.push('avatar = ?');
            updateValues.push(avatar);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }

        updateValues.push(id);

        const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await executeQuery(updateQuery, updateValues);

        // Get updated user
        const updatedUserQuery = `
            SELECT id, name, email, phone, gender, role, avatar, created_at, updated_at
            FROM users WHERE id = ?
        `;
        const updatedUsers = await executeQuery(updatedUserQuery, [id]);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUsers[0]
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengupdate user'
        });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;

        // Check if user exists
        const existingUserQuery = 'SELECT * FROM users WHERE id = ?';
        const existingUsers = await executeQuery(existingUserQuery, [id]);

        if (existingUsers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Prevent deletion of admin users (optional safety measure)
        if (existingUsers[0].role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin user tidak dapat dihapus'
            });
        }

        const deleteQuery = 'DELETE FROM users WHERE id = ?';
        await executeQuery(deleteQuery, [id]);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat menghapus user'
        });
    }
};

// Reset password
export const resetPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { newPassword } = req.body;

        // Check if user exists
        const existingUserQuery = 'SELECT * FROM users WHERE id = ?';
        const existingUsers = await executeQuery(existingUserQuery, [id]);

        if (existingUsers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const updateQuery = `
            UPDATE users 
            SET password = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [hashedPassword, id]);

        // Get updated user (without password)
        const updatedUserQuery = `
            SELECT id, name, email, phone, gender, role, avatar, created_at, updated_at
            FROM users WHERE id = ?
        `;
        const updatedUsers = await executeQuery(updatedUserQuery, [id]);

        res.json({
            success: true,
            message: 'Password reset successfully',
            data: updatedUsers[0]
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mereset password'
        });
    }
};