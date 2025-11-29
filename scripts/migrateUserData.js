/**
 * Script de Migración de Datos - Modelo User
 * 
 * Este script transforma los documentos existentes en MongoDB
 * de la estructura antigua a la nueva estructura modular.
 * 
 * IMPORTANTE: Ejecutar en ambiente de desarrollo primero
 * 
 * Uso:
 *   node scripts/migrateUserData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/degader');
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

// Schema antiguo (solo para lectura)
const OldUserSchema = new mongoose.Schema({}, { strict: false });
const OldUser = mongoose.model('OldUser', OldUserSchema, 'users');

// Schema nuevo (importar el modelo actual)
const User = require('../src/models/User');

const migrateUsers = async () => {
  try {
    console.log('🔄 Iniciando migración de usuarios...\n');

    // Obtener todos los usuarios con estructura antigua
    const oldUsers = await OldUser.find({}).lean();
    console.log(`📊 Encontrados ${oldUsers.length} usuarios para migrar\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldUser of oldUsers) {
      try {
        // Verificar si ya tiene la nueva estructura
        if (oldUser.nombres && oldUser.nombres.primero) {
          console.log(`⏭️  Usuario ${oldUser.email} ya migrado, saltando...`);
          skipped++;
          continue;
        }

        // Construir objeto con nueva estructura
        const newUserData = {
          // Core
          nombres: {
            primero: oldUser.nombre || '',
            segundo: oldUser.segundoNombre || null
          },
          apellidos: {
            primero: oldUser.apellido || '',
            segundo: oldUser.segundoApellido || null
          },
          email: oldUser.email,
          password: oldUser.password,

          // Flags
          esMiembroFundacion: Boolean(oldUser.legajo || oldUser.area || oldUser.cargo),
          esMiembroIglesia: Boolean(oldUser.ministerio?.iglesiaNombre),

          // Personal
          personal: {
            fechaNacimiento: oldUser.fechaNacimiento || null,
            celular: oldUser.telefono || null,
            direccion: oldUser.direccionUsuario || null,
            ubicacion: {
              pais: oldUser.ubicacion?.pais || oldUser.paisUsuario || oldUser.pais || null,
              ciudad: oldUser.ubicacion?.ciudad || oldUser.ciudadUsuario || oldUser.ciudad || null,
              estado: oldUser.ubicacion?.subdivision || null,
              subdivision: oldUser.ubicacion?.subdivision || null,
              paisCode: oldUser.ubicacion?.paisCode || 'AR'
            }
          },

          // Fundación (si aplica)
          fundacion: (oldUser.legajo || oldUser.area || oldUser.cargo) ? {
            activo: true,
            codigoEmpleado: oldUser.legajo || null,
            area: oldUser.area || null,
            cargo: oldUser.cargo || null
          } : undefined,

          // Eclesiástico (si aplica)
          eclesiastico: oldUser.ministerio ? {
            activo: true,
            pastor: oldUser.ministerio.pastor || null,
            iglesiaNombre: oldUser.ministerio.iglesiaNombre || null,
            denominacion: oldUser.ministerio.denominacion || null,
            direccionMinisterio: oldUser.ministerio.direccionMinisterio || null,
            rolMinisterio: oldUser.ministerio.rolMinisterio || null
          } : undefined,

          // Social
          social: {
            fotoPerfil: oldUser.avatar || oldUser.fotoPerfil || null,
            fotoBanner: oldUser.banner || oldUser.fotoBannerPerfil || null,
            biografia: oldUser.biografia || '',
            privacidad: oldUser.privacidad || {
              perfilPublico: true,
              mostrarEmail: false,
              mostrarTelefono: false,
              permitirMensajes: true
            }
          },

          // Seguridad
          seguridad: {
            rolSistema: oldUser.rol || 'usuario',
            estadoCuenta: oldUser.estado || 'activo',
            verificado: false
          },

          // Legacy fields
          ultimaConexion: oldUser.ultimaConexion || new Date(),
          savedPosts: oldUser.savedPosts || [],

          // Timestamps
          createdAt: oldUser.createdAt || new Date(),
          updatedAt: oldUser.updatedAt || new Date()
        };

        // Actualizar el documento
        await OldUser.updateOne(
          { _id: oldUser._id },
          { $set: newUserData }
        );

        console.log(`✅ Migrado: ${oldUser.email}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Error al migrar ${oldUser.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Resumen de Migración:');
    console.log(`   ✅ Migrados: ${migrated}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📦 Total: ${oldUsers.length}\n`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  }
};

// Ejecutar migración
const run = async () => {
  try {
    await connectDB();
    await migrateUsers();
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migración falló:', error);
    process.exit(1);
  }
};

// Ejecutar solo si se llama directamente
if (require.main === module) {
  run();
}

module.exports = { migrateUsers };
