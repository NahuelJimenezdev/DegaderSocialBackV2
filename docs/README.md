# Degader Social Backend V2

API REST completa para la red social Degader, construida con Node.js, Express y MongoDB.

## 🚀 Características

- ✅ Autenticación JWT con Argon2
- ✅ Sistema de publicaciones con likes, comentarios y compartidos
- ✅ Sistema de amistades con solicitudes
- ✅ Grupos públicos, privados y secretos
- ✅ Sistema de notificaciones en tiempo real
- ✅ Chat privado (conversaciones)
- ✅ Upload de imágenes (avatares, posts, grupos)
- ✅ Paginación en todos los endpoints
- ✅ Validación de datos
- ✅ Manejo de errores centralizado

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- MongoDB Atlas (ya configurado en .env)
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio (si aplica)**
   ```bash
   cd DegaderSocialBackV2
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Verificar archivo .env**

   El archivo `.env` ya está configurado con:
   ```env
   PORT=3001
   MONGO_ACCESS=mongodb+srv://...
   JWT_SECRET=ibrahimJimenez123
   ```

4. **Crear estructura de carpetas para uploads**
   ```bash
   mkdir -p uploads/avatars uploads/posts uploads/groups uploads/messages
   ```
   (Ya creadas automáticamente)

## 🎯 Iniciar el Servidor

### Modo Desarrollo (con auto-reload)
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor iniciará en: `http://localhost:3001`

## 📡 Endpoints API

### 🔐 Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/profile` | Obtener perfil | Sí |
| PUT | `/api/auth/change-password` | Cambiar contraseña | Sí |

### 👥 Usuarios (`/api/usuarios`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/usuarios` | Listar usuarios | Sí |
| GET | `/api/usuarios/search?q=texto` | Buscar usuarios | Sí |
| GET | `/api/usuarios/:id` | Obtener usuario por ID | Sí |
| PUT | `/api/usuarios/profile` | Actualizar perfil | Sí |
| PUT | `/api/usuarios/avatar` | Subir avatar | Sí |
| DELETE | `/api/usuarios/deactivate` | Desactivar cuenta | Sí |

### 📝 Publicaciones (`/api/publicaciones`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/publicaciones` | Crear publicación | Sí |
| GET | `/api/publicaciones/feed` | Obtener feed | Sí |
| GET | `/api/publicaciones/user/:userId` | Posts de usuario | Sí |
| POST | `/api/publicaciones/:id/like` | Dar/quitar like | Sí |
| POST | `/api/publicaciones/:id/comment` | Comentar | Sí |
| POST | `/api/publicaciones/:id/share` | Compartir | Sí |
| DELETE | `/api/publicaciones/:id` | Eliminar publicación | Sí |

### 🤝 Amistades (`/api/amistades`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/amistades/request` | Enviar solicitud | Sí |
| GET | `/api/amistades/pending` | Solicitudes pendientes | Sí |
| GET | `/api/amistades/friends` | Listar amigos | Sí |
| POST | `/api/amistades/:id/accept` | Aceptar solicitud | Sí |
| POST | `/api/amistades/:id/reject` | Rechazar solicitud | Sí |
| DELETE | `/api/amistades/:friendId` | Eliminar amistad | Sí |

### 👨‍👩‍👧‍👦 Grupos (`/api/grupos`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/grupos` | Listar grupos | Sí |
| GET | `/api/grupos/:id` | Obtener grupo | Sí |
| POST | `/api/grupos` | Crear grupo | Sí |
| PUT | `/api/grupos/:id` | Actualizar grupo | Sí |
| POST | `/api/grupos/:id/join` | Unirse al grupo | Sí |
| POST | `/api/grupos/:id/leave` | Salir del grupo | Sí |
| DELETE | `/api/grupos/:id` | Eliminar grupo | Sí |

### 🔔 Notificaciones (`/api/notificaciones`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/notificaciones` | Todas las notificaciones | Sí |
| GET | `/api/notificaciones/unread` | No leídas | Sí |
| GET | `/api/notificaciones/unread-count` | Contar no leídas | Sí |
| PUT | `/api/notificaciones/:id/read` | Marcar como leída | Sí |
| PUT | `/api/notificaciones/mark-all-read` | Marcar todas leídas | Sí |

### 💬 Conversaciones (`/api/conversaciones`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/conversaciones` | Todas las conversaciones | Sí |
| GET | `/api/conversaciones/:id` | Obtener conversación | Sí |
| POST | `/api/conversaciones/with/:userId` | Crear/obtener conversación | Sí |
| POST | `/api/conversaciones/:id/message` | Enviar mensaje | Sí |
| PUT | `/api/conversaciones/:id/read` | Marcar como leída | Sí |

## 🔑 Autenticación

El sistema usa JWT (JSON Web Tokens). Para acceder a endpoints protegidos:

1. **Registrarse o hacer login** para obtener un token
2. **Incluir el token** en el header de cada petición:
   ```
   Authorization: Bearer {tu_token_aquí}
   ```

### Ejemplo de Registro:
```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@email.com",
  "password": "password123",
  "legajo": "12345",
  "area": "Sistemas",
  "cargo": "Developer"
}
```

### Ejemplo de Login:
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "juan@email.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "_id": "...",
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@email.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 📁 Estructura del Proyecto

```
DegaderSocialBackV2/
├── src/
│   ├── controllers/          # Lógica de negocio
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── postController.js
│   │   ├── friendshipController.js
│   │   ├── groupController.js
│   │   ├── notificationController.js
│   │   └── conversationController.js
│   ├── models/               # Modelos de Mongoose
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Friendship.js
│   │   ├── Group.js
│   │   ├── Notification.js
│   │   └── Conversation.js
│   ├── routes/               # Definición de rutas
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── post.routes.js
│   │   ├── friendship.routes.js
│   │   ├── group.routes.js
│   │   ├── notification.routes.js
│   │   └── conversation.routes.js
│   ├── middleware/           # Middleware personalizado
│   │   ├── auth.middleware.js
│   │   └── upload.middleware.js
│   ├── utils/                # Utilidades
│   │   └── validators.js
│   └── index.js              # Punto de entrada
├── uploads/                  # Archivos subidos
│   ├── avatars/
│   ├── posts/
│   ├── groups/
│   └── messages/
├── .env                      # Variables de entorno
├── package.json
└── README.md
```

## 🧪 Probar la API

### Opción 1: Postman / Insomnia
Importa los endpoints y prueba cada uno con los ejemplos del README.

### Opción 2: cURL
```bash
# Registrar usuario
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test",
    "apellido": "User",
    "email": "test@test.com",
    "password": "123456"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "123456"
  }'
```

### Opción 3: Frontend (DegaderFrontV2)
El frontend ya está configurado para conectarse a este backend en `http://localhost:3001/api`

## 🐛 Solución de Problemas

### Error de conexión a MongoDB
```
❌ Error al conectar a MongoDB
```
**Solución:** Verificar que la URL de MongoDB en `.env` sea correcta y que tengas acceso a internet.

### Error: EADDRINUSE
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solución:** El puerto 3001 está en uso. Mata el proceso o cambia el puerto en `.env`:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID {PID} /F

# Linux/Mac
lsof -ti:3001 | xargs kill
```

### Error de autenticación 401
**Solución:** Verifica que:
1. Estés enviando el token en el header `Authorization: Bearer {token}`
2. El token no haya expirado (válido por 7 días)
3. El usuario exista y esté activo

## 📝 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3001` |
| `MONGO_ACCESS` | URL de MongoDB | `mongodb+srv://...` |
| `JWT_SECRET` | Secreto para JWT | `tu_secreto_aqui` |
| `NODE_ENV` | Ambiente | `development` o `production` |

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con Argon2
- ✅ JWT con expiración de 7 días
- ✅ Validación de entrada en todos los endpoints
- ✅ CORS habilitado
- ✅ Headers de seguridad

## 📚 Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación con tokens
- **Argon2** - Hash de contraseñas
- **Multer** - Upload de archivos
- **Morgan** - Logging HTTP
- **CORS** - Cross-Origin Resource Sharing

## 🤝 Integración con Frontend

El frontend **DegaderFrontV2** ya está configurado para usar este backend:

1. **Asegúrate que el frontend tenga el archivo `.env`:**
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_ENV=development
   ```

2. **Inicia el backend primero:**
   ```bash
   cd DegaderSocialBackV2
   npm run dev
   ```

3. **Luego inicia el frontend:**
   ```bash
   cd DegaderFrontV2
   npm run dev
   ```

4. **Accede a:** `http://localhost:5173`

## 📞 Soporte

Si encuentras algún problema:
1. Verifica que MongoDB esté conectado
2. Revisa los logs del servidor
3. Verifica que todas las dependencias estén instaladas
4. Asegúrate de estar usando Node.js v14+

## 📄 Licencia

Este proyecto es parte de Degader Social V2.

---

**¡Listo para usar! 🚀**
