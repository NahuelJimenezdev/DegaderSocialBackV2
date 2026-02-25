require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

const testUsers = [
    {
        email: 'founder@gmail.com',
        username: 'founder_test',
        nombres: { primero: 'Founder', segundo: 'Test' },
        apellidos: { primero: 'Degader', segundo: 'Social' },
        password: '123456',
        seguridad: { rolSistema: 'Founder', estadoCuenta: 'activo' }
    },
    {
        email: 'nacional@gmail.com',
        username: 'dir_nacional',
        nombres: { primero: 'Director', segundo: 'Nacional' },
        apellidos: { primero: 'Prueba', segundo: 'Infra' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'nacional',
            area: 'Dirección de Infraestructura',
            cargo: 'Director Nacional',
            territorio: { pais: 'Colombia' },
            estadoAprobacion: 'aprobado'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    },
    {
        email: 'regional@gmail.com',
        username: 'dir_regional',
        nombres: { primero: 'Director', segundo: 'Regional' },
        apellidos: { primero: 'Prueba', segundo: 'Infra' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'regional',
            area: 'Dirección de Infraestructura',
            cargo: 'Director Regional',
            territorio: { pais: 'Colombia', region: 'Antioquia' },
            estadoAprobacion: 'aprobado'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    },
    {
        email: 'departamental@gmail.com',
        username: 'dir_departamental',
        nombres: { primero: 'Director', segundo: 'Depto' },
        apellidos: { primero: 'Prueba', segundo: 'Infra' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'departamental',
            area: 'Dirección de Infraestructura',
            cargo: 'Director Departamental',
            territorio: { pais: 'Colombia', region: 'Antioquia', departamento: 'Antioquia' },
            estadoAprobacion: 'aprobado'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    },
    {
        email: 'psicosocial@gmail.com',
        username: 'solicitante_mun',
        nombres: { primero: 'Solicitante', segundo: 'Psico' },
        apellidos: { primero: 'Prueba', segundo: 'Infra' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'municipal',
            area: 'Dirección de Infraestructura',
            cargo: 'Coordinador Municipal',
            territorio: { pais: 'Colombia', region: 'Antioquia', departamento: 'Antioquia', municipio: 'Medellin' },
            estadoAprobacion: 'pendiente'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    }
];

async function setupHierarchy() {
    try {
        await mongoose.connect(uri);
        console.log('✅ Conectado a MongoDB');

        for (const userData of testUsers) {
            // Eliminar si ya existe para evitar errores de duplicidad
            await User.deleteOne({ email: userData.email });
            await User.deleteOne({ username: userData.username });

            const user = new User(userData);
            await user.save();
            console.log(`👤 Usuario creado: ${userData.email}`);
        }

        console.log('✅ Jerarquía de prueba configurada correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error configurando jerarquía:', error);
        process.exit(1);
    }
}

setupHierarchy();
