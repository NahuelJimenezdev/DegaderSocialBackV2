const mongoose = require('mongoose');
const argon2 = require('argon2');
require('dotenv').config();

// Conectar a MongoDB
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';

const uri = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_CLUSTER}/${DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function resetPasswords() {
    try {
        await mongoose.connect(uri);
        console.log('✅ Conectado a MongoDB');

        const User = mongoose.model('UserV2', new mongoose.Schema({}, { strict: false }));

        const userIds = [
            '693f51058401ceef132c1172',
            '693f523f8401ceef132c14a0'
        ];

        const newPassword = '123456';
        const hashedPassword = await argon2.hash(newPassword);

        for (const userId of userIds) {
            const user = await User.findById(userId);

            if (user) {
                console.log(`\n📧 Usuario encontrado:`);
                console.log(`   ID: ${user._id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Nombre: ${user.nombres?.primero} ${user.apellidos?.primero}`);

                user.password = hashedPassword;
                await user.save();

                console.log(`✅ Contraseña reseteada a: 123456`);
            } else {
                console.log(`❌ Usuario ${userId} no encontrado`);
            }
        }

        console.log('\n✅ Proceso completado');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetPasswords();
