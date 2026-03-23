require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Challenge = require('../src/models/challenge.model');
const UserV2 = require('../src/models/User.model');
const fs = require('fs');

async function testQuery() {
    let out = '';
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
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
        const sampleUser = await UserV2.findOne({ 'social.fotoPerfil': { $exists: true, $ne: "" } });
        out += `Sample user with fotoPerfil: ${sampleUser ? sampleUser.social.fotoPerfil : 'None'}\n`;
        
        const sampleUsersAny = await UserV2.find().limit(5);
        out += sampleUsersAny.map(u => `User: ${u.email}, fotoPerfil: ${u.social?.fotoPerfil}`).join('\n') + '\n';

        fs.writeFileSync('db_results.txt', out);
    } catch (err) {
        fs.writeFileSync('db_results.txt', `Error: ${err.message}\n` + out);
    } finally {
        await mongoose.disconnect();
    }
}
testQuery();
