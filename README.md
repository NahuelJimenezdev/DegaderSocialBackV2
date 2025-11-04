# 🚀 Degader Social Backend V2

Backend completo para la red social institucional Degader, construido con Node.js, Express, MongoDB y Socket.IO.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Arquitectura](#-arquitectura)
- [API Endpoints](#-api-endpoints)
- [Socket.IO Events](#-socketio-events)
- [Variables de Entorno](#-variables-de-entorno)
- [Scripts](#-scripts)
- [Documentación API](#-documentación-api)

## ✨ Características

### Funcionalidades Principales
- 🔐 **Autenticación JWT** con tokens de larga duración
- 👥 **Sistema de usuarios** con roles y permisos
- 📝 **Publicaciones** con likes, comentarios y compartir
- 🤝 **Sistema de amistades** con solicitudes
- 💬 **Mensajería en tiempo real** con Socket.IO
- 🔔 **Notificaciones en tiempo real**
- 📅 **Eventos** con registro de participantes
- 👥 **Grupos** con roles y administración
- 🔍 **Búsqueda global** de usuarios, posts, grupos y eventos

### Características Institucionales
- 🏢 **Áreas** organizacionales
- 📚 **Recursos** y documentos
- 📁 **Carpetas compartidas** de grupos
- ✉️ **Correo interno** institucional
- 📂 **Carpetas personales**

### Características Técnicas
- ⚡ **Socket.IO** para comunicación en tiempo real
- 🛡️ **Rate Limiting** para protección contra abuse
- 📤 **Upload de archivos** con Multer
- 🔒 **Passwords hasheados** con Argon2
- 📊 **Paginación** en todas las listas
- 🚨 **Manejo de errores** centralizado
- 📝 **Documentación Swagger/OpenAPI**
- 🔄 **CORS** configurado

## 🛠️ Tecnologías

- **Runtime**: Node.js
- **Framework**: Express 5.x
- **Base de datos**: MongoDB con Mongoose
- **Autenticación**: JWT + Argon2
- **Tiempo real**: Socket.IO
- **Validación**: Custom validators
- **Upload**: Multer
- **Documentación**: Swagger/OpenAPI
- **Rate Limiting**: express-rate-limit

## 📦 Instalación

### Prerrequisitos
- Node.js >= 18.x
- MongoDB >= 6.x
- npm o yarn

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/NahuelJimenezdev/DegaderSocialBackV2.git

# Entrar al directorio
cd DegaderSocialBackV2

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores

# Iniciar en modo desarrollo
npm run dev
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# General
NODE_ENV=development
PORT=3000

# Base de datos
MONGO_ACCESS=mongodb+srv://...

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Ver [Variables de Entorno](#-variables-de-entorno-detalladas) para más detalles.

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Con Debug
```bash
npm run dev:debug
```

El servidor estará disponible en: `http://localhost:3000`

## 🏗️ Arquitectura

### Estructura del Proyecto

```
DegaderSocialBackV2/
├── src/
│   ├── config/           # Configuraciones
│   │   ├── socket.js     # Config de Socket.IO
│   │   └── swagger.js    # Config de Swagger
│   ├── controllers/      # Controladores
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── post.controller.js
│   │   ├── amistad.controller.js
│   │   ├── conversacion.controller.js
│   │   ├── notificacion.controller.js
│   │   ├── evento.controller.js
│   │   ├── grupo.controller.js
│   │   └── search.controller.js
│   ├── middlewares/      # Middlewares
│   │   ├── auth.js       # Autenticación JWT
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── upload.js     # Multer config
│   │   └── validators.js
│   ├── models/           # Modelos de Mongoose
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Amistad.js
│   │   ├── Conversacion.js
│   │   ├── Notificacion.js
│   │   ├── Evento.js
│   │   ├── Grupo.js
│   │   ├── Area.js
│   │   ├── Resource.js
│   │   ├── GroupFolder.js
│   │   ├── InternalMail.js
│   │   └── Carpeta.js
│   ├── routes/           # Rutas
│   │   ├── index.routes.js
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── posts.routes.js
│   │   ├── amistades.routes.js
│   │   ├── conversaciones.routes.js
│   │   ├── notificaciones.routes.js
│   │   ├── eventos.routes.js
│   │   ├── grupos.routes.js
│   │   ├── search.routes.js
│   │   ├── areas.routes.js
│   │   ├── resources.routes.js
│   │   ├── groupfolders.routes.js
│   │   ├── internalmails.routes.js
│   │   └── carpetas.routes.js
│   ├── services/         # Lógica de negocio
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── post.service.js
│   │   ├── amistad.service.js
│   │   ├── conversacion.service.js
│   │   ├── notificacion.service.js
│   │   ├── evento.service.js
│   │   ├── grupo.service.js
│   │   └── search.service.js
│   └── index.js          # Punto de entrada
├── uploads/              # Archivos subidos
│   ├── avatars/
│   ├── posts/
│   ├── documents/
│   ├── events/
│   └── groups/
├── .env                  # Variables de entorno (no versionado)
├── .env.example          # Ejemplo de variables
├── .env.development      # Variables de desarrollo
├── .env.production       # Variables de producción
├── .gitignore
├── package.json
└── README.md
```

### Patrón de Arquitectura

El proyecto sigue el patrón **MVC (Model-View-Controller)** con capa de servicios:

1. **Routes** → Definen endpoints y middlewares
2. **Controllers** → Manejan requests/responses HTTP
3. **Services** → Contienen lógica de negocio
4. **Models** → Esquemas de MongoDB con Mongoose

## 📡 API Endpoints

### Autenticación
```
POST   /api/auth/register       # Registrar usuario
POST   /api/auth/login          # Iniciar sesión
GET    /api/auth/profile        # Obtener perfil (requiere auth)
PUT    /api/auth/change-password # Cambiar contraseña (requiere auth)
```

### Usuarios
```
GET    /api/usuarios            # Listar usuarios
GET    /api/usuarios/search     # Buscar usuarios
GET    /api/usuarios/:id        # Obtener usuario por ID
PUT    /api/usuarios/profile    # Actualizar perfil
PUT    /api/usuarios/avatar     # Actualizar avatar
DELETE /api/usuarios/deactivate # Desactivar cuenta
```

### Publicaciones
```
POST   /api/publicaciones                  # Crear publicación
GET    /api/publicaciones/feed             # Feed de publicaciones
GET    /api/publicaciones/user/:userId     # Posts de un usuario
GET    /api/publicaciones/:id              # Obtener publicación
POST   /api/publicaciones/:id/like         # Like/Unlike
POST   /api/publicaciones/:id/comment      # Comentar
POST   /api/publicaciones/:id/share        # Compartir
DELETE /api/publicaciones/:id              # Eliminar
```

### Amistades
```
POST   /api/amistades/request      # Enviar solicitud
POST   /api/amistades/:id/accept   # Aceptar solicitud
POST   /api/amistades/:id/reject   # Rechazar solicitud
GET    /api/amistades/friends      # Lista de amigos
GET    /api/amistades/pending      # Solicitudes pendientes
DELETE /api/amistades/:friendId    # Eliminar amistad
```

### Conversaciones
```
GET    /api/conversaciones                   # Todas las conversaciones
GET    /api/conversaciones/unread-count      # Contador de no leídos
GET    /api/conversaciones/:id               # Ver conversación
GET    /api/conversaciones/user/:userId      # Obtener/crear conversación
POST   /api/conversaciones/:id/message       # Enviar mensaje
PUT    /api/conversaciones/:id/read          # Marcar como leído
```

### Notificaciones
```
GET    /api/notificaciones              # Todas las notificaciones
GET    /api/notificaciones/unread       # No leídas
GET    /api/notificaciones/unread-count # Contador
PUT    /api/notificaciones/:id/read     # Marcar como leída
PUT    /api/notificaciones/read-all     # Marcar todas como leídas
DELETE /api/notificaciones/:id          # Eliminar
```

### Eventos
```
GET    /api/eventos               # Listar eventos
GET    /api/eventos/upcoming      # Próximos eventos
GET    /api/eventos/:id           # Ver evento
POST   /api/eventos               # Crear evento
POST   /api/eventos/:id/register  # Registrarse
POST   /api/eventos/:id/unregister # Cancelar registro
PUT    /api/eventos/:id           # Actualizar
DELETE /api/eventos/:id           # Eliminar
```

### Grupos
```
GET    /api/grupos             # Listar grupos
GET    /api/grupos/:id         # Ver grupo
POST   /api/grupos             # Crear grupo
POST   /api/grupos/:id/join    # Unirse
POST   /api/grupos/:id/leave   # Salir
POST   /api/grupos/:id/accept  # Aceptar solicitud
PUT    /api/grupos/:id/member/role # Actualizar rol
DELETE /api/grupos/:id         # Eliminar
```

### Búsqueda
```
GET    /api/buscar?q=texto&tipo=  # Búsqueda global
```

### Otros
```
GET    /api/areas              # Áreas institucionales
GET    /api/resources          # Recursos
GET    /api/group-folders      # Carpetas de grupos
GET    /api/secretaria         # Correo interno
GET    /api/carpetas           # Carpetas personales
```

## 🔌 Socket.IO Events

### Eventos del Cliente

```javascript
// Conectar (automático con autenticación)
socket.auth = { token: 'Bearer tu_token_jwt' };

// Unirse a conversación
socket.emit('conversation:join', conversationId);

// Salir de conversación
socket.emit('conversation:leave', conversationId);

// Usuario escribiendo
socket.emit('conversation:typing', { conversationId });

// Usuario dejó de escribir
socket.emit('conversation:stop-typing', { conversationId });

// Mensaje leído
socket.emit('message:read', { conversationId, messageId });

// Unirse a grupo
socket.emit('group:join', groupId);

// Salir de grupo
socket.emit('group:leave', groupId);
```

### Eventos del Servidor

```javascript
// Usuario online
socket.on('user:online', (data) => {
  // { userId, userName }
});

// Usuario offline
socket.on('user:offline', (data) => {
  // { userId, userName }
});

// Nuevo mensaje
socket.on('message:new', (data) => {
  // { conversacion, mensaje }
});

// Usuario escribiendo
socket.on('user:typing', (data) => {
  // { userId, userName, conversationId }
});

// Usuario dejó de escribir
socket.on('user:stop-typing', (data) => {
  // { userId, conversationId }
});

// Mensaje leído
socket.on('message:read', (data) => {
  // { userId, conversationId, messageId }
});

// Nueva notificación
socket.on('notification:new', (notificacion) => {
  // Objeto notificación completo
});
```

## 🔐 Autenticación

### Registro
```bash
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "password": "password123"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

### Uso del Token
```bash
GET /api/usuarios
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Variables de Entorno Detalladas

### General
- `NODE_ENV` - Ambiente (development, production, test)
- `PORT` - Puerto del servidor (default: 3000)

### Base de Datos
- `MONGO_ACCESS` - URI de conexión a MongoDB

### Seguridad
- `JWT_SECRET` - Secret para firmar tokens JWT
- `JWT_EXPIRES_IN` - Tiempo de expiración del token (ej: 7d, 24h)

### Frontend
- `FRONTEND_URL` - URL del frontend para CORS
- `CORS_ORIGIN` - Orígenes permitidos (separados por coma)

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Ventana de tiempo en ms
- `RATE_LIMIT_MAX_REQUESTS` - Máximo de requests por ventana

### Socket.IO
- `SOCKET_PING_TIMEOUT` - Timeout de ping
- `SOCKET_PING_INTERVAL` - Intervalo de ping

## 📜 Scripts

```bash
# Desarrollo
npm run dev              # Iniciar con nodemon
npm run dev:debug        # Iniciar con inspector

# Producción
npm start                # Iniciar servidor
npm run prod             # Alias para start

# Tests
npm test                 # Ejecutar tests (próximamente)
```

## 📖 Documentación API

La documentación completa de la API está disponible en Swagger UI:

**Desarrollo**: http://localhost:3000/api-docs

La documentación incluye:
- Todos los endpoints disponibles
- Esquemas de request/response
- Ejemplos de uso
- Autenticación
- Códigos de error

## 🛡️ Rate Limiting

El API tiene protección contra abuse con diferentes límites:

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| API General | 100 requests | 15 min |
| Login/Register | 5 intentos | 15 min |
| Crear contenido | 10 requests | 1 min |
| Mensajes | 30 requests | 1 min |
| Búsquedas | 20 requests | 1 min |
| Uploads | 5 requests | 1 min |

## 🤝 Integración con Frontend

### Instalación en el Frontend

```bash
npm install socket.io-client axios
```

### Configuración Base

```javascript
// config/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Socket.IO en el Frontend

```javascript
// config/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  }
});

// Conectar cuando el usuario haga login
export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
};

// Desconectar al logout
export const disconnectSocket = () => {
  socket.disconnect();
};
```

### Ejemplo de Uso

```javascript
// Login
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { token, user } = response.data.data;

  localStorage.setItem('token', token);
  connectSocket(token);

  return user;
};

// Escuchar notificaciones
socket.on('notification:new', (notification) => {
  console.log('Nueva notificación:', notification);
  // Actualizar UI
});

// Enviar mensaje
socket.emit('conversation:join', conversationId);
socket.on('message:new', (data) => {
  console.log('Nuevo mensaje:', data.mensaje);
});
```

## 📝 Notas Importantes

### Seguridad
- Cambia `JWT_SECRET` en producción por un valor muy seguro
- Usa HTTPS en producción
- Configura correctamente los CORS
- Revisa los logs regularmente

### Rendimiento
- MongoDB debe tener índices configurados
- Considera usar Redis para sessions en producción
- Configura rate limiting según tus necesidades

### Escalabilidad
- Socket.IO puede usar Redis para múltiples instancias
- Considera usar clusters de Node.js
- Implementa caché para consultas frecuentes

## 🐛 Troubleshooting

### Error de conexión a MongoDB
```
Error: connect ECONNREFUSED
```
**Solución**: Verifica que `MONGO_ACCESS` en `.env` sea correcto

### Socket.IO no conecta
**Solución**:
- Verifica que el token JWT sea válido
- Revisa que CORS esté configurado correctamente
- Asegúrate de que el frontend use el mismo puerto

### Uploads no funcionan
**Solución**:
- Verifica que existe la carpeta `uploads/`
- Revisa permisos de escritura
- Asegúrate de usar multipart/form-data

## 👥 Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC © 2025 Degader Social

## 👤 Autor

**Tu Nombre**
- GitHub: [@NahuelJimenezdev](https://github.com/NahuelJimenezdev)

---

⭐️ **¿Te gustó el proyecto? ¡Dale una estrella en GitHub!**
