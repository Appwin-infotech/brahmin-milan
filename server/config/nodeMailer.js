require("dotenv").config();
const nodemailer=require('nodemailer');

exports.transporter = nodemailer.createTransport({

    host: 'smtp.hostinger.com',
    port: 465, 
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});