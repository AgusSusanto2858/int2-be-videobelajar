import { validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

// Get all courses
export const getAllCourses = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { category, limit, offset, search, sortBy, sort } = req.query;

        let query = `
            SELECT id, title, description, photos, mentor, rolementor, avatar,
                   company, rating, review_count, price, category, created_at, updated_at
            FROM courses
        `;

        const queryParams = [];
        const conditions = [];

        // Filtering
        if (category) {
            conditions.push('category = ?');
            queryParams.push(category);
        }

        // Searching
        if (search) {
            conditions.push('title LIKE ?');
            queryParams.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Sorting
        const allowedSort = ['created_at', 'title', 'price', 'rating'];
        const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'created_at';
        const sortOrder = sort && sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;

        // Add pagination if provided
        if (limit) {
            query += ' LIMIT ?';
            queryParams.push(parseInt(limit));
            
            if (offset) {
                query += ' OFFSET ?';
                queryParams.push(parseInt(offset));
            }
        }

        const courses = await executeQuery(query, queryParams);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM courses';
        const countParams = [];

        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
            countParams.push(...queryParams.slice(0, conditions.length));
        }

        const countResult = await executeQuery(countQuery, countParams);
        const totalCount = countResult[0].total;

        res.json({
            success: true,
            message: 'Courses retrieved successfully',
            data: courses,
            pagination: {
                total: totalCount,
                count: courses.length,
                limit: limit ? parseInt(limit) : null,
                offset: offset ? parseInt(offset) : null
            }
        });

    } catch (error) {
        console.error('Get all courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data courses'
        });
    }
};

// Get course by ID
export const getCourseById = async (req, res) => {
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
            SELECT id, title, description, photos, mentor, rolementor, avatar, 
                   company, rating, review_count, price, category, created_at, updated_at
            FROM courses
            WHERE id = ?
        `;
        
        const courses = await executeQuery(query, [id]);

        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Course retrieved successfully',
            data: courses[0]
        });

    } catch (error) {
        console.error('Get course by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data course'
        });
    }
};

// Get courses by category
export const getCoursesByCategory = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { category } = req.params;
        
        const query = `
            SELECT id, title, description, photos, mentor, rolementor, avatar, 
                   company, rating, review_count, price, category, created_at, updated_at
            FROM courses
            WHERE category = ?
            ORDER BY created_at DESC
        `;
        
        const courses = await executeQuery(query, [category]);

        res.json({
            success: true,
            message: `Courses in category '${category}' retrieved successfully`,
            data: courses,
            count: courses.length
        });

    } catch (error) {
        console.error('Get courses by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data courses'
        });
    }
};

// Create new course
export const createCourse = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            title,
            description,
            photos,
            mentor,
            rolementor,
            avatar,
            company,
            rating,
            review_count,
            price,
            category
        } = req.body;

        const insertQuery = `
            INSERT INTO courses (
                title, description, photos, mentor, rolementor, avatar, 
                company, rating, review_count, price, category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await executeQuery(insertQuery, [
            title,
            description,
            photos || null,
            mentor,
            rolementor,
            avatar || null,
            company,
            rating || 0,
            review_count || 0,
            price,
            category
        ]);

        // Get the created course
        const newCourseQuery = `
            SELECT id, title, description, photos, mentor, rolementor, avatar, 
                   company, rating, review_count, price, category, created_at, updated_at
            FROM courses WHERE id = ?
        `;
        const newCourses = await executeQuery(newCourseQuery, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: newCourses[0]
        });

    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat membuat course'
        });
    }
};

// Update course
export const updateCourse = async (req, res) => {
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
        const {
            title,
            description,
            photos,
            mentor,
            rolementor,
            avatar,
            company,
            rating,
            review_count,
            price,
            category
        } = req.body;

        // Check if course exists
        const existingCourseQuery = 'SELECT * FROM courses WHERE id = ?';
        const existingCourses = await executeQuery(existingCourseQuery, [id]);

        if (existingCourses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course tidak ditemukan'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (photos !== undefined) {
            updateFields.push('photos = ?');
            updateValues.push(photos || null);
        }
        if (mentor !== undefined) {
            updateFields.push('mentor = ?');
            updateValues.push(mentor);
        }
        if (rolementor !== undefined) {
            updateFields.push('rolementor = ?');
            updateValues.push(rolementor);
        }
        if (avatar !== undefined) {
            updateFields.push('avatar = ?');
            updateValues.push(avatar || null);
        }
        if (company !== undefined) {
            updateFields.push('company = ?');
            updateValues.push(company);
        }
        if (rating !== undefined) {
            updateFields.push('rating = ?');
            updateValues.push(rating);
        }
        if (review_count !== undefined) {
            updateFields.push('review_count = ?');
            updateValues.push(review_count);
        }
        if (price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(price);
        }
        if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }

        updateValues.push(id);

        const updateQuery = `
            UPDATE courses 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await executeQuery(updateQuery, updateValues);

        // Get updated course
        const updatedCourseQuery = `
            SELECT id, title, description, photos, mentor, rolementor, avatar, 
                   company, rating, review_count, price, category, created_at, updated_at
            FROM courses WHERE id = ?
        `;
        const updatedCourses = await executeQuery(updatedCourseQuery, [id]);

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: updatedCourses[0]
        });

    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengupdate course'
        });
    }
};

// Delete course
export const deleteCourse = async (req, res) => {
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

        // Check if course exists
        const existingCourseQuery = 'SELECT * FROM courses WHERE id = ?';
        const existingCourses = await executeQuery(existingCourseQuery, [id]);

        if (existingCourses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course tidak ditemukan'
            });
        }

        const deleteQuery = 'DELETE FROM courses WHERE id = ?';
        await executeQuery(deleteQuery, [id]);

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });

    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat menghapus course'
        });
    }
};

// Reset to default courses
export const resetToDefaultCourses = async (req, res) => {
    try {
        // First, delete all existing courses
        const deleteAllQuery = 'DELETE FROM courses';
        await executeQuery(deleteAllQuery);

        // Reset auto-increment
        const resetAutoIncrementQuery = 'ALTER TABLE courses AUTO_INCREMENT = 1';
        await executeQuery(resetAutoIncrementQuery);

        // Insert default courses
        const defaultCourses = [
            {
                title: "Big 4 Auditor Financial Analyst",
                description: "Mulai transformasi dengan instruktur profesional, harga yang terjangkau, dan sistem pembelajaran yang mudah dipahami.",
                photos: '/images/cards/card1.png',
                mentor: "Jenna Ortega",
                rolementor: "Senior Accountant",
                avatar: '/images/tutors/tutor-card1.png',
                company: "Gojek",
                rating: 4.5,
                review_count: 126,
                price: "300K",
                category: "Bisnis"
            },
            {
                title: "Digital Marketing Strategy",
                description: "Pelajari strategi pemasaran digital yang efektif untuk meningkatkan brand awareness dan konversi.",
                photos: '/images/cards/card2.png',
                mentor: "Sarah Johnson",
                rolementor: "Marketing Director",
                avatar: '/images/tutors/tutor-card2.png',
                company: "Tokopedia",
                rating: 4.2,
                review_count: 98,
                price: "250K",
                category: "Pemasaran"
            },
            {
                title: "UI/UX Design Fundamentals",
                description: "Kuasai dasar-dasar desain UI/UX untuk menciptakan pengalaman pengguna yang luar biasa.",
                photos: '/images/cards/card3.png',
                mentor: "Michael Chen",
                rolementor: "Lead Designer",
                avatar: '/images/tutors/tutor-card3.png',
                company: "Grab",
                rating: 4.7,
                review_count: 204,
                price: "400K",
                category: "Desain"
            }
        ];

        const insertQuery = `
            INSERT INTO courses (
                title, description, photos, mentor, rolementor, avatar, 
                company, rating, review_count, price, category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const createdCourses = [];
        
        for (const course of defaultCourses) {
            const result = await executeQuery(insertQuery, [
                course.title,
                course.description,
                course.photos,
                course.mentor,
                course.rolementor,
                course.avatar,
                course.company,
                course.rating,
                course.review_count,
                course.price,
                course.category
            ]);

            // Get the created course
            const newCourseQuery = `
                SELECT id, title, description, photos, mentor, rolementor, avatar, 
                       company, rating, review_count, price, category, created_at, updated_at
                FROM courses WHERE id = ?
            `;
            const newCourses = await executeQuery(newCourseQuery, [result.insertId]);
            createdCourses.push(newCourses[0]);
        }

        res.json({
            success: true,
            message: 'Courses reset to default successfully',
            data: createdCourses,
            count: createdCourses.length
        });

    } catch (error) {
        console.error('Reset courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mereset courses'
        });
    }
};