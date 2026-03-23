const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Use relative paths from the script location
const Challenge = require(path.join(__dirname, '../src/models/challenge.model'));
const UserV2 = require(path.join(__dirname, '../src/models/User.model'));
const fs = require('fs');

async function testQuery() {
    let out = '';
    const resultsFile = path.join(__dirname, '../db_results.txt');
    try {
        console.log("URI from env:", process.env.MONGODB_URI);
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        out += "Connected to DB.\n";
        
        const count = await Challenge.countDocuments();
        out += `Total Challenges in DB: ${count}\n`;
        
        const pipeline = [
          { $match: { $or: [{ 'metadata.active': true }, { metadata: { $exists: false } }] } },
          { $sample: { size: 10 } }
        ];
        const results = await Challenge.aggregate(pipeline);
        out += `Sample results length: ${results.length}\n`;

        const userCount = await UserV2.countDocuments();
        out += `Total Users in DB: ${userCount}\n`;
        
        // Check for users with photos
        const usersWithPhotos = await UserV2.find({ 'social.fotoPerfil': { $exists: true, $ne: "" } }).limit(5);
        out += `Users with photos count (limit 5): ${usersWithPhotos.length}\n`;
        usersWithPhotos.forEach(u => {
            out += `User: ${u.email}, fotoPerfil: ${u.social.fotoPerfil}\n`;
        });

        // Check any 5 users
        const anyUsers = await UserV2.find().limit(5);
        out += "Any 5 users:\n";
        anyUsers.forEach(u => {
            out += `User: ${u.email}, ID: ${u._id}, foto: ${u.social?.fotoPerfil || 'NONE'}\n`;
        });

        fs.writeFileSync(resultsFile, out);
        console.log("Results written to:", resultsFile);
    } catch (err) {
        console.error("Script Error:", err);
        fs.writeFileSync(resultsFile, `Error: ${err.message}\n` + out);
    } finally {
        await mongoose.disconnect();
    }
}
testQuery();
