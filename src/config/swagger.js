const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Degader Social API V2',
      version: '2.0.0',
      description: `
API completa para la red social institucional Degader.

**Características principales:**
- Autenticación con JWT
- Sistema de usuarios y perfiles
- Publicaciones con likes y comentarios
- Sistema de amistades
- Mensajería en tiempo real
- Notificaciones
- Eventos y grupos
- Sistema institucional (áreas, recursos, correo interno)
      `,
      contact: {
        name: 'Soporte Degader',
        email: 'soporte@degadersocial.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api-prod.degadersocial.com/api',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa tu token JWT en el formato: Bearer {token}'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            nombre: { type: 'string', example: 'Juan' },
            apellido: { type: 'string', example: 'Pérez' },
            email: { type: 'string', format: 'email', example: 'juan@example.com' },
            avatar: { type: 'string', example: '/uploads/avatars/avatar123.jpg' },
            biografia: { type: 'string', example: 'Desarrollador full stack' },
            rol: { type: 'string', enum: ['usuario', 'administrador', 'moderador'], example: 'usuario' },
            verificado: { type: 'boolean', example: false },
            activo: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            autor: { $ref: '#/components/schemas/User' },
            contenido: { type: 'string' },
            imagenes: { type: 'array', items: { type: 'object' } },
            tipo: { type: 'string', enum: ['texto', 'imagen', 'video', 'documento', 'evento'] },
            visibilidad: { type: 'string', enum: ['publico', 'amigos', 'privado'] },
            likes: { type: 'array', items: { type: 'string' } },
            comentarios: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Evento: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            titulo: { type: 'string' },
            descripcion: { type: 'string' },
            creador: { $ref: '#/components/schemas/User' },
            fechaInicio: { type: 'string', format: 'date-time' },
            fechaFin: { type: 'string', format: 'date-time' },
            ubicacion: { type: 'object' },
            categoria: { type: 'string' },
            participantes: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Mensaje de error' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operación exitosa' },
            data: { type: 'object' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token no proporcionado o inválido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Error de validación',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Autenticación', description: 'Endpoints de autenticación y registro' },
      { name: 'Usuarios', description: 'Gestión de usuarios y perfiles' },
      { name: 'Publicaciones', description: 'CRUD de publicaciones' },
      { name: 'Amistades', description: 'Sistema de amistades' },
      { name: 'Conversaciones', description: 'Mensajería' },
      { name: 'Notificaciones', description: 'Sistema de notificaciones' },
      { name: 'Eventos', description: 'Gestión de eventos' },
      { name: 'Grupos', description: 'Grupos y comunidades' },
      { name: 'Búsqueda', description: 'Búsqueda global' }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'] // Archivos que contienen anotaciones
};

const specs = swaggerJsdoc(options);

module.exports = specs;
