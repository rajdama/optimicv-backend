const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const accountSid = '';
const authToken = '';
const { parse } = require('json2csv');
const client = require('twilio')(accountSid, authToken);


const app = express();
app.use(bodyParser.json());
app.use(cors());

const jsonFilePath = "./numbers.json";

const readJsonFile = () => {
    if (!fs.existsSync(jsonFilePath)) {
        return [];
    }
    const fileData = fs.readFileSync(jsonFilePath);
    return JSON.parse(fileData);
};

// Utility function to write JSON file
const writeJsonFile = (data) => {
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
};

const otps = {}; // In-memory store for OTPs

const sendOtp = async (to) => {
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    storeOtp(to, otp);

    await client.messages.create({
        from: '+12293944522',
        to: to,
        body: `Your OTP is ${otp}`
    });

    console.log(`OTP ${otp} sent to ${to}`);
};

const storeOtp = (phoneNumber, otp) => {
    otps[phoneNumber] = otp;
    // Set an expiration time for the OTP (e.g., 5 minutes)
    setTimeout(() => {
        delete otps[phoneNumber];
    }, 300000);
};

const verifyOtp = (phoneNumber, otp) => {
    console.log(otps)
    if (otps[phoneNumber] && otps[phoneNumber] == otp) {
        console.log('OTP verified successfully');
        return true;    
    } else {
        console.log('Invalid OTP');
        return false;
    }
};

app.get('/send-otp', async (req, res) => {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    if (phoneNumber.startsWith('+91')) {
        phoneNumber = phoneNumber.slice(3);
    }
    try {
        await sendOtp(`+91${phoneNumber}`);
        res.send('OTP sent.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to send OTP.');
    }
});

app.post('/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;

    const phoneNumbers = readJsonFile();
    if (phoneNumbers.some(entry => entry.number === phoneNumber)) {
        return res.status(400).json({ error: 'duplicate' });
    }

    phoneNumbers.push({ PhoneNumbers: `\t${phoneNumber}` });
    writeJsonFile(phoneNumbers);
    if (verifyOtp(phoneNumber, otp)) {
        res.status(200).send('OTP verified successfully');
    } else {
        res.status(400).send('Invalid OTP');
    }
});

app.get('/download', (req, res) => {
    const phoneNumbers = readJsonFile();
    const fields = ['PhoneNumbers'];
    const csv = parse(phoneNumbers, { fields });

    res.header('Content-Type', 'text/csv');
    res.attachment('phoneNumbers.csv');
    res.send(csv);
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});
