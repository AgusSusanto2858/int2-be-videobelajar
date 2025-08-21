import nodemailer from 'nodemailer';

// Function to send verification email
export const sendVerificationEmail = async (to, token) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/verifikasi-email?token=${token}`;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: 'Email Verification',
        html: `<p>Please verify your email by clicking <a href="${verificationUrl}">this link</a>.</p>`
    });
};

export default sendVerificationEmail;
