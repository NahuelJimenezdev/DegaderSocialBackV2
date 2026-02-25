require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

const testUsers = [
    {
        email: 'founder@gmail.com',
        username: 'founder_test',
        nombres: { primero: 'Founder', segundo: 'Global' },
        apellidos: { primero: 'Degader', segundo: 'Social' },
        password: '123456',
        seguridad: { rolSistema: 'Founder', estadoCuenta: 'activo' }
    },
    // ÁREA: DIRECCIÓN DE INFRAESTRUCTURA
    {
        email: 'infraestructura@gmail.com',
        username: 'dir_infra_nac',
        nombres: { primero: 'Director', segundo: 'Nacional' },
        apellidos: { primero: 'Infraestructura', segundo: 'Prueba' },
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
    // ÁREA: DIRECCIÓN DE SALUD (Jerarquía Completa hasta Departamental)
    {
        email: 'nacional@gmail.com',
        username: 'dir_salud_nac',
        nombres: { primero: 'Director', segundo: 'Nacional' },
        apellidos: { primero: 'Salud', segundo: 'Prueba' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'nacional',
            area: 'Dirección de Salud',
            cargo: 'Director Nacional',
            territorio: { pais: 'Colombia' },
            estadoAprobacion: 'aprobado'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    },
    {
        email: 'regional@gmail.com',
        username: 'dir_salud_reg',
        nombres: { primero: 'Director', segundo: 'Regional' },
        apellidos: { primero: 'Salud', segundo: 'Prueba' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'regional',
            area: 'Dirección de Salud',
            cargo: 'Director Regional',
            territorio: { pais: 'Colombia', region: 'Antioquia' },
            estadoAprobacion: 'aprobado'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    },
    {
        email: 'departamental@gmail.com',
        username: 'dir_salud_depto',
        nombres: { primero: 'Director', segundo: 'Depto' },
        apellidos: { primero: 'Salud', segundo: 'Prueba' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'departamental',
            area: 'Dirección de Salud',
            cargo: 'Director Departamental',
            territorio: { pais: 'Colombia', region: 'Antioquia', departamento: 'Antioquia' },
            estadoAprobacion: 'aprobado'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    },
    // SOLICITANTE MUNICIPAL (ÁREA SALUD)
    {
        email: 'psicosocial@gmail.com',
        username: 'psicosocial_mun',
        nombres: { primero: 'Solicitante', segundo: 'Psicosocial' },
        apellidos: { primero: 'Salud', segundo: 'Muncipal' },
        password: '123456',
        esMiembroFundacion: true,
        fundacion: {
            activo: true,
            nivel: 'municipal',
            area: 'Dirección de Salud',
            cargo: 'Coordinador Municipal',
            territorio: { pais: 'Colombia', region: 'Antioquia', departamento: 'Antioquia', municipio: 'Medellin' },
            estadoAprobacion: 'pendiente'
        },
        seguridad: { rolSistema: 'usuario', estadoCuenta: 'activo' }
    }
];

async function finalSetup() {
    try {
        await mongoose.connect(uri);
        console.log('✅ Conectado a MongoDB');

        for (const userData of testUsers) {
            await User.deleteOne({ email: userData.email });
            await User.deleteOne({ username: userData.username });
            const user = new User(userData);
            await user.save();
            console.log(`👤 Usuario listo: ${userData.email}`);
        }

        console.log('✅ Base de datos lista para pruebas manuales.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

finalSetup();
