const axios = require('axios');

const SMS_GATEWAY_API_KEY = process.env.SMS_GATEWAY_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'YOUR_SENDER_ID';
const DLT_TEMPLATE_ID = process.env.DLT_TEMPLATE_ID || 'YOUR_DLT_TEMPLATE_ID';
const ENTITY_ID = process.env.ENTITY_ID || 'YOUR_ENTITY_ID';

const generateOTP = () => {
    return Math.floor(100000 + Math.random()*900000).toString(); 
}

const sendOTP = async (mobileNo, otp) => {
    try {
        const messageText = `Your OTP for Brahmin Milan platform is ${otp}. Do not share with anyone. - Appwin Info Tech`;

        // Check if the number starts with 91
        let cleanNumber = mobileNo.replace(/[^0-9]/g, '');  // Remove any non-numeric characters

        // If the number doesn't start with 91, add 91 prefix
        if (!cleanNumber.startsWith('91')) {
            cleanNumber = '91' + cleanNumber;  // Add 91 prefix if missing
        }

        console.log('Original number:', mobileNo);
        console.log('Cleaned number:', cleanNumber);  // Should now handle cases like 917990588286 or 7990588286 correctly

        const url = `https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=${SMS_GATEWAY_API_KEY}&senderid=${SMS_SENDER_ID}&channel=2&DCS=0&flashsms=0&number=${cleanNumber}&text=${encodeURIComponent(messageText)}&route=1&EntityId=${ENTITY_ID}&dlttemplateid=${DLT_TEMPLATE_ID}`;

        const response = await axios.get(url);
        console.log("API Response:", response.data);

        if (response.data && response.data.ErrorCode === '000') {
            return { success: true, message: 'OTP sent successfully' };
        } else {
            return { 
                success: false, 
                message: `SMS Gateway Error: ${response.data?.ErrorMessage || 'Unknown error'}`,
                errorCode: response.data?.ErrorCode
            };
        }
    } catch (error) {
        console.error("Error details:", error);
        return { success: false, message: `Failed to send OTP: ${error.message}` };
    }
};



module.exports = { generateOTP, sendOTP };