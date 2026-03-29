const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./src/models/User.model');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ 
            $or: [
                { 'nombres.primero': /Hector/i },
                { 'apellidos.primero': /Palavecino/i }
            ]
        }).select('nombres apellidos email fundacion createdAt').lean();

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('-----------------------------');
        console.log('Name:', user.nombres.primero, user.apellidos.primero);
        console.log('Email:', user.email);
        console.log('CreatedAt:', user.createdAt);
        console.log('Fundacion:', JSON.stringify(user.fundacion, null, 2));
        console.log('-----------------------------');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();
