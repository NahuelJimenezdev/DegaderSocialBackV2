/**
 * Script de utilidad para asignar rol de Founder a un usuario
 * 
 * Uso:
 * node src/scripts/setFounderRole.js <email_del_usuario>
 * 
 * Ejemplo:
 * node src/scripts/setFounderRole.js fundador@ejemplo.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

// Conexión a MongoDB
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function setFounderRole(email) {
    try {
        // Conectar a MongoDB
        await mongoose.connect(uri);
        console.log('✅ Conectado a MongoDB');

        // Buscar usuario por email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`❌ Usuario no encontrado: ${email}`);
            process.exit(1);
        }

        console.log(`\n📋 Usuario encontrado:`);
        console.log(`   Nombre: ${user.nombres.primero} ${user.apellidos.primero}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Rol actual: ${user.seguridad?.rolSistema || 'usuario'}`);

        // Actualizar rol a Founder
        user.seguridad = user.seguridad || {};
        user.seguridad.rolSistema = 'Founder';

        // Asegurar todos los permisos
        user.seguridad.permisos = user.seguridad.permisos || {};
        user.seguridad.permisos.moderarContenido = true;
        user.seguridad.permisos.accesoPanelAdmin = true;
        user.seguridad.permisos.gestionarUsuarios = true;

        await user.save();

        console.log(`\n✅ Rol actualizado exitosamente:`);
        console.log(`   Nuevo rol: Founder`);
        console.log(`   Permisos completos: ✓`);
        console.log(`\n🎯 El usuario ahora puede acceder a:`);
        console.log(`   - Dashboard de moderación (/moderacion)`);
        console.log(`   - Dashboard de auditoría (Founder)`);
        console.log(`   - Todos los reportes y estadísticas`);
        console.log(`   - Escalar y revertir casos`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Conexión cerrada');
        process.exit(0);
    }
}

// Obtener email del argumento de línea de comandos
const email = process.argv[2];

if (!email) {
    console.error('❌ Debes proporcionar un email');
    console.log('\nUso:');
    console.log('  node src/scripts/setFounderRole.js <email_del_usuario>');
    console.log('\nEjemplo:');
    console.log('  node src/scripts/setFounderRole.js fundador@ejemplo.com');
    process.exit(1);
}

setFounderRole(email);
