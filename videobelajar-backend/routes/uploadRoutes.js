import express from 'express';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            filename: req.file.filename,
            path: req.file.path
        }
    });
});

export default router;
