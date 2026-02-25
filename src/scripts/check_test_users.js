require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function checkUsers() {
    try {
        await mongoose.connect(uri);
        console.log('✅ Conectado a MongoDB');

        const emails = [
            'psicosocial@gmail.com',
            'infraestructura@gmail.com',
            'departamental@gmail.com',
            'regional@gmail.com',
            'nacional@gmail.com',
            'founder@gmail.com'
        ];

        const users = await User.find({ email: { $in: emails } }).select('email fundacion.nivel fundacion.area');
        console.log('USUARIOS_ENCONTRADOS:');
        console.log(JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
