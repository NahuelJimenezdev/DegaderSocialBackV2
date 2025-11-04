const { Router } = require('express');

const users = require('./users.routes');
const posts = require('./posts.routes');
const auth = require('./auth.routes');
const amistades = require('./amistades.routes');
const conversaciones = require('./conversaciones.routes');
const notificaciones = require('./notificaciones.routes');
const areas = require('./areas.routes');
const search = require('./search.routes');
const eventos = require('./eventos.routes');
const groupfolders = require('./groupfolders.routes');
const grupos = require('./grupos.routes');
const resources = require('./resources.routes');
const internalmails = require('./internalmails.routes');
const carpetas = require('./carpetas.routes');
const { verifyToken } = require('../middlewares/auth');

const api = Router();

// Ruta raíz de la API
api.get('/', (req, res) => res.json({
  ok: true,
  name: 'API Degader Social',
  version: '2.0.0'
}));

// Rutas de autenticación (públicas)
api.use('/auth', auth);

// Rutas de usuarios
api.use('/usuarios', users);

// Rutas de publicaciones
api.use('/publicaciones', posts);

// Rutas de amistades
api.use('/amistades', amistades);

// Rutas de notificaciones
api.use('/notificaciones', notificaciones);

// Rutas de conversaciones / mensajería
api.use('/conversaciones', conversaciones);

// Rutas de áreas (institucional)
api.use('/areas', verifyToken, areas);

// Rutas de búsqueda
api.use('/buscar', verifyToken, search);

// Rutas de eventos
api.use('/eventos', eventos);

// Rutas de carpetas de grupos
api.use('/group-folders', verifyToken, groupfolders);

// Rutas de grupos
api.use('/grupos', grupos);

// Rutas de recursos
api.use('/resources', verifyToken, resources);

// Rutas de secretaría / correo interno
api.use('/secretaria', verifyToken, internalmails);

// Rutas de carpetas personales
api.use('/carpetas', carpetas);

module.exports = api;
