require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const fundador = await User.findOne({
            'nombres.primero': { $regex: /Fundador/i }
        }).select('nombres apellidos username social.username email');

        if (fundador) {
            console.log('--- USER FOUND ---');
            console.log('ID:', fundador._id);
            console.log('Name:', `${fundador.nombres.primero} ${fundador.apellidos.primero}`);
            console.log('Root Username:', fundador.username);
            console.log('Social Username:', fundador.social?.username);
            console.log('------------------');

            if (!fundador.username && !fundador.social?.username) {
                console.log('⚠️ USER HAS NO USERNAME!');

                // Auto-fix option (uncomment to apply)
                // fundador.username = 'fundadordegader';
                // await fundador.save();
                // console.log('✅ FIXED: Assigned username "fundadordegader"');
            }
        } else {
            console.log('User "Fundador" not found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
