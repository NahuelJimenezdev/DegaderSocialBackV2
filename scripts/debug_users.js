require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');

const cleanString = (str) => {
    return str ? str.replace(/[\x00-\x1F\x7F-\x9F]/g, "") : "";
};

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const users = await User.find({}).select('nombres apellidos social.username username email');

        console.log('\n--- USERS IN DB ---');
        users.forEach(u => {
            const socialUsername = u.social ? u.social.username : 'undefined';
            console.log(`ID: ${u._id}`);
            console.log(`Name: ${u.nombres?.primero} ${u.apellidos?.primero}`);
            console.log(`Email: ${u.email}`);
            console.log(`Social.Username: '${cleanString(socialUsername)}'`);
            console.log(`Root.Username: '${cleanString(u.username)}'`);
            console.log('---');
        });

        // Check specific search for 'carolina' broadly
        console.log("\n--- SEARCHING FOR 'carolina' ---");
        const caros = await User.find({
            $or: [
                { 'nombres.primero': { $regex: /carolina/i } },
                { 'apellidos.primero': { $regex: /carolina/i } },
                { 'social.username': { $regex: /carolina/i } },
                { 'username': { $regex: /carolina/i } },
                { 'email': { $regex: /carolina/i } }
            ]
        });

        if (caros.length === 0) {
            console.log("No user found matching 'carolina'");
        } else {
            caros.forEach(u => {
                console.log(`FOUND ID: ${u._id}`);
                console.log(`Name: ${u.nombres?.primero} ${u.apellidos?.primero}`);
                console.log(`Email: ${u.email}`);
                console.log(`Social.Username: '${u.social?.username}'`); // Check raw value
                console.log(`Root.Username: '${u.username}'`);
                console.log(`Full Social Object:`, u.social);
                console.log('---');
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
