/**
 * 🔍 AUDITORÍA DE BASE DE DATOS (SOLO LECTURA)
 * Verifica integridad de los 39 usuarios sin modificar nada
 */
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const User = require('./src/models/User.model');

  // ========== 1. USUARIO ESPECÍFICO ==========
  console.log('\n' + '='.repeat(70));
  console.log('🔍 AUDITORÍA: joselinjimenezmoreno@gmail.com');
  console.log('='.repeat(70));

  const joselin = await User.findOne({ email: 'joselinjimenezmoreno@gmail.com' }).select('-password').lean();
  if (joselin) {
    console.log(JSON.stringify({
      _id: joselin._id,
      email: joselin.email,
      nombres: joselin.nombres,
      apellidos: joselin.apellidos,
      username: joselin.username,
      esMiembroFundacion: joselin.esMiembroFundacion,
      fundacion: joselin.fundacion,
      seguridad: joselin.seguridad,
      personal: joselin.personal,
      __v: joselin.__v,
      createdAt: joselin.createdAt
    }, null, 2));
  } else {
    console.log('❌ USUARIO NO ENCONTRADO');
  }

  // ========== 2. AUDITORÍA GLOBAL (39 USUARIOS) ==========
  console.log('\n' + '='.repeat(70));
  console.log('🔍 AUDITORÍA GLOBAL: Todos los usuarios');
  console.log('='.repeat(70));

  const todos = await User.find({}).select('email nombres apellidos username seguridad fundacion esMiembroFundacion personal.ubicacion __v createdAt').lean();
  
  console.log(`\n📊 TOTAL USUARIOS: ${todos.length}\n`);

  const problemas = [];

  todos.forEach((u, i) => {
    const issues = [];

    // 1. ¿Tiene nombres?
    if (!u.nombres || !u.nombres.primero) issues.push('SIN_NOMBRE');
    // 2. ¿Tiene apellidos?
    if (!u.apellidos || !u.apellidos.primero) issues.push('SIN_APELLIDO');
    // 3. ¿Tiene seguridad?
    if (!u.seguridad) issues.push('SIN_SEGURIDAD');
    // 4. ¿Estado de cuenta?
    if (u.seguridad?.estadoCuenta !== 'activo') issues.push(`ESTADO:${u.seguridad?.estadoCuenta || 'null'}`);
    // 5. ¿Tiene username?
    if (!u.username) issues.push('SIN_USERNAME');
    // 6. ¿Es miembro fundación pero NO aprobado?
    if (u.esMiembroFundacion && u.fundacion?.estadoAprobacion !== 'aprobado') {
      issues.push(`FUND_PENDIENTE:${u.fundacion?.estadoAprobacion || 'null'}`);
    }
    // 7. ¿Es miembro fundación pero sin nivel?
    if (u.esMiembroFundacion && !u.fundacion?.nivel) issues.push('FUND_SIN_NIVEL');
    // 8. ¿Es miembro fundación pero sin territorio/pais?
    if (u.esMiembroFundacion && u.fundacion?.estadoAprobacion === 'aprobado' && !u.fundacion?.territorio?.pais) {
      issues.push('FUND_SIN_PAIS');
    }
    // 9. ¿Versión vieja del documento?
    if (u.__v === undefined || u.__v === null) issues.push('SIN_VERSION');

    const nombre = `${u.nombres?.primero || '???'} ${u.apellidos?.primero || '???'}`;
    const rol = u.seguridad?.rolSistema || 'sin_rol';
    const estado = u.seguridad?.estadoCuenta || 'sin_estado';
    const miembroF = u.esMiembroFundacion ? 'SI' : 'NO';
    const nivelF = u.fundacion?.nivel || '-';
    const aprobF = u.fundacion?.estadoAprobacion || '-';
    const paisF = u.fundacion?.territorio?.pais || '-';
    const cargoF = u.fundacion?.cargo || '-';

    console.log(`${(i+1).toString().padStart(2)}. ${nombre.padEnd(30)} | ${rol.padEnd(10)} | ${estado.padEnd(22)} | Fund:${miembroF} | Nivel:${nivelF.padEnd(15)} | Aprob:${aprobF.padEnd(10)} | País:${paisF.padEnd(12)} | Cargo:${cargoF}`);

    if (issues.length > 0) {
      problemas.push({ email: u.email, nombre, issues });
    }
  });

  // ========== 3. RESUMEN DE PROBLEMAS ==========
  console.log('\n' + '='.repeat(70));
  console.log(`⚠️  USUARIOS CON PROBLEMAS: ${problemas.length}/${todos.length}`);
  console.log('='.repeat(70));

  if (problemas.length > 0) {
    problemas.forEach(p => {
      console.log(`  ❌ ${p.email} (${p.nombre}): ${p.issues.join(', ')}`);
    });
  } else {
    console.log('  ✅ Todos los usuarios están en estado correcto');
  }

  // ========== 4. ESTADÍSTICAS ==========
  console.log('\n' + '='.repeat(70));
  console.log('📊 ESTADÍSTICAS');
  console.log('='.repeat(70));

  const activos = todos.filter(u => u.seguridad?.estadoCuenta === 'activo').length;
  const pendientes = todos.filter(u => u.seguridad?.estadoCuenta === 'pendiente_validacion').length;
  const miembros = todos.filter(u => u.esMiembroFundacion).length;
  const aprobados = todos.filter(u => u.fundacion?.estadoAprobacion === 'aprobado').length;
  const founders = todos.filter(u => u.seguridad?.rolSistema === 'Founder').length;

  console.log(`  Activos: ${activos} | Pendientes Validación: ${pendientes} | Miembros Fundación: ${miembros} | Aprobados: ${aprobados} | Founders: ${founders}`);

  process.exit(0);
}).catch(e => { console.error('❌ Error conectando:', e.message); process.exit(1); });
