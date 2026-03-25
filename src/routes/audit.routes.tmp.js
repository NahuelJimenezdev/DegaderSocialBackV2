// Temporal para auditar DB
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');

router.get('/', async (req, res) => {
  try {
    const todos = await User.find({}).select('email nombres apellidos username seguridad fundacion esMiembroFundacion personal.ubicacion __v createdAt').lean();
    
    const joselin = todos.find(u => u.email === 'joselinjimenezmoreno@gmail.com');

    const problemas = [];

    todos.forEach((u, i) => {
      const issues = [];
      if (!u.nombres || !u.nombres.primero) issues.push('SIN_NOMBRE');
      if (!u.apellidos || !u.apellidos.primero) issues.push('SIN_APELLIDO');
      if (!u.seguridad) issues.push('SIN_SEGURIDAD');
      if (u.seguridad?.estadoCuenta !== 'activo') issues.push('ESTADO:' + (u.seguridad?.estadoCuenta || 'null'));
      if (!u.username) issues.push('SIN_USERNAME');
      if (u.esMiembroFundacion && u.fundacion?.estadoAprobacion !== 'aprobado') issues.push('FUND_PENDIENTE:' + (u.fundacion?.estadoAprobacion || 'null'));
      if (u.esMiembroFundacion && !u.fundacion?.nivel) issues.push('FUND_SIN_NIVEL');
      if (u.esMiembroFundacion && u.fundacion?.estadoAprobacion === 'aprobado' && !u.fundacion?.territorio?.pais) issues.push('FUND_SIN_PAIS');
      if (u.__v === undefined || u.__v === null) issues.push('SIN_VERSION');
      
      const nombre = (u.nombres?.primero || '???') + ' ' + (u.apellidos?.primero || '???');
      const rol = u.seguridad?.rolSistema || 'sin_rol';
      const estado = u.seguridad?.estadoCuenta || 'sin_estado';
      const miembroF = u.esMiembroFundacion ? 'SI' : 'NO';
      const nivelF = u.fundacion?.nivel || '-';
      const aprobF = u.fundacion?.estadoAprobacion || '-';
      const paisF = u.fundacion?.territorio?.pais || '-';
      const cargoF = u.fundacion?.cargo || '-';
      
      const text = (i+1).toString().padStart(2) + '. ' + nombre.padEnd(30) + ' | ' + rol.padEnd(10) + ' | ' + estado.padEnd(20) + ' | Fund:' + miembroF + ' | Nivel:' + nivelF.padEnd(15) + ' | Pais:' + paisF.padEnd(10) + ' | Cargo:' + cargoF;
      
      if (issues.length > 0) problemas.push({ email: u.email, nombre, text, issues });
    });

    res.json({
      joselin,
      total_usuarios: todos.length,
      problemas,
      detalle_todos: todos.map(u => ({
         email: u.email,
         nombre: (u.nombres?.primero || '') + ' ' + (u.apellidos?.primero || ''),
         rol: u.seguridad?.rolSistema,
         miembro: u.esMiembroFundacion,
         fundacion_nivel: u.fundacion?.nivel,
         fundacion_cargo: u.fundacion?.cargo,
         fundacion_pais: u.fundacion?.territorio?.pais
      }))
    });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
