const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const DeviceTokenSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    token: String,
    platform: String,
    lastUsedAt: Date
});

const DeviceToken = mongoose.model('DeviceToken', DeviceTokenSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tokens = await DeviceToken.find({});
        console.log(`TOTAL TOKENS: ${tokens.length}`);
        tokens.forEach((t, i) => {
            console.log(`[${i}] User: ${t.userId} | Platform: ${t.platform} | Token prefix: ${t.token.substring(0, 10)}...`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
