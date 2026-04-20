# Login - Sistema de Autenticación

## 📋 Descripción General
El sistema de login permite a los usuarios autenticarse en la aplicación DegaderSocial utilizando sus credenciales (email/username y contraseña).

---

## 🔧 Componentes Principales

### Backend

#### 1. **Modelo de Usuario**
**Archivo:** `src/models/User.model.js`

**Campos Críticos para Login:**
- `email` - Email único del usuario
- `username` - Nombre de usuario único (opcional para login)
- `password` - Contraseña hasheada con bcrypt
- `nombres.primero` - Primer nombre del usuario
- `apellidos.primero` - Primer apellido del usuario

**Importante:** El modelo User utiliza una estructura jerárquica con sub-esquemas. Asegúrate de usar la ruta correcta:
```javascript
const User = require('../models/User.model.js');
```

#### 2. **Controlador de Autenticación**
**Archivo:** `src/controllers/authController.js`

**Funciones Principales:**
- `login()` - Maneja el proceso de autenticación
- `register()` - Registra nuevos usuarios
- `logout()` - Invalida sesiones
- `forgotPassword()` / `resetPassword()` - Flujo de recuperación de contraseñas.
- `getProfile()` - Retorna los datos del usuario actual y sirve para verificar el token JWT.

**Proceso de Login:**
1. Recibe email/username y password
2. Busca el usuario en la base de datos
3. Compara la contraseña usando bcrypt
4. Verifica que la cuenta no esté suspendida temporaria o permanentemente
5. Genera un token JWT
6. Retorna el token y datos del usuario

### Proceso de Registro
**Campos Requeridos del Formulario:**
- `nombre` (Se mapea a `nombres.primero`)
- `apellido` (Se mapea a `apellidos.primero`)
- `email` (Debe ser único)
- `fechaNacimiento` (Requerido para cálculo de edad)
- `password` (Mínimo 6 caracteres)
- `confirmPassword` (Debe coincidir con `password`)

**Validaciones Frontend:**
- Todos los campos son obligatorios.
- Las contraseñas deben coincidir.
- Email con formato válido.

**Flujo de Registro:**
1. Frontend envía datos a `POST /api/auth/register`.
2. Backend valida duplicidad de email/username vía Middlewares validadores.
3. Se crea usuario con estructura `UserV2`.
4. Se genera token JWT automático para login inmediato.
5. Redirección al feed/inicio.

#### 3. **Rutas de Autenticación**
**Archivo:** `src/routes/auth.routes.js`

**Endpoints Públicos:**
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/forgot-password` - Solicitar reset de contraseña
- `POST /api/auth/reset-password/:token` - Aplicar nueva contraseña

**Endpoints Protegidos:**
- `GET /api/auth/profile` - Obtener datos y verificar token
- `POST /api/auth/logout` - Cerrar sesión
- `PUT /api/auth/change-password` - Cambiar clave estando logueado
- `POST /api/auth/admin/reset-password` - Admin reseteando clave

#### 4. **Middleware de Autenticación**
**Archivo:** `src/middleware/auth.middleware.js`

**Función:** `authenticate(req, res, next)`
- Verifica que el token JWT sea válido
- Extrae el ID del usuario del token
- Adjunta el usuario a `req.userId`
- Bloquea cuentas suspendidas.

### Frontend

#### 1. **Componente de Login**
**Archivo:** `src/components/Login.jsx` o `src/pages/LoginPage.jsx`

**Funcionalidad:**
- Formulario con campos de email/username y password
- Validación de campos
- Llamada a la API de login
- Redirección después del login exitoso

#### 2. **Contexto de Autenticación**
**Archivo:** `src/context/AuthContext.jsx`

**Funciones:**
- `login(credentials)` - Envía credenciales al backend
- `logout()` - Cierra sesión y limpia el token
- `isAuthenticated` - Estado de autenticación
- `user` - Datos del usuario autenticado

**Almacenamiento del Token:**
- LocalStorage: `localStorage.setItem('token', token)`
- Headers de Axios: `Authorization: Bearer ${token}`

---

## ⚠️ Errores Comunes y Soluciones

### 1. **Error 401 - Unauthorized**
**Causas:**
- Credenciales incorrectas
- Token expirado o inválido
- Usuario no existe en la base de datos

**Solución:**
- Verificar que el email/username existe
- Verificar que la contraseña sea correcta
- Revisar la configuración de JWT_SECRET en `.env`

### 2. **Error 404 - Not Found**
**Causas:**
- Ruta de API incorrecta
- Backend no está corriendo

**Solución:**
- Verificar que el backend esté corriendo en el puerto correcto (ej: 3001)
- Verificar la URL en el frontend: `http://localhost:3001/api/auth/login`

### 3. **CORS Error**
**Causas:**
- Configuración CORS incorrecta en el backend

**Solución:**
- Verificar `src/app.js` o `src/server.js`:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', // URL del frontend
  credentials: true
}));
```

### 4. **Password No Coincide**
**Causas:**
- La contraseña no está siendo hasheada correctamente
- Comparación incorrecta con bcrypt

**Solución:**
- Verificar que se use `bcrypt.compare(password, user.password)`
- Verificar que el password se hashee al registrar: `bcrypt.hash(password, 10)`

### 5. **Token No Se Guarda**
**Causas:**
- No se está guardando el token en localStorage
- El token no se está enviando en los headers

**Solución:**
- Guardar token después del login:
```javascript
localStorage.setItem('token', response.data.token);
```
- Configurar Axios para enviar el token:
```javascript
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

---

## 🔍 Dependencias Críticas

### Backend
```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0",
  "express": "^4.18.2",
  "mongoose": "^7.0.0",
  "cors": "^2.8.5"
}
```

### Frontend
```json
{
  "axios": "^1.4.0",
  "react": "^18.2.0",
  "react-router-dom": "^6.11.0"
}
```

---

## 📝 Variables de Entorno Necesarias

**Archivo:** `.env` (en el backend)

```env
JWT_SECRET=tu_clave_secreta_muy_segura
JWT_EXPIRES_IN=7d
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/degadersocial
PORT=3001
```

---

## ✅ Checklist de Verificación

Cuando hay problemas con el login, verificar:

- [ ] El backend está corriendo (`npm run dev` en la carpeta del backend)
- [ ] MongoDB está conectado correctamente
- [ ] El modelo User.model.js existe y está correctamente importado
- [ ] Las rutas de autenticación están registradas en `app.js`
- [ ] CORS está configurado para permitir el origen del frontend
- [ ] JWT_SECRET está definido en `.env`
- [ ] El frontend está haciendo la petición a la URL correcta
- [ ] El token se está guardando en localStorage después del login
- [ ] El token se está enviando en los headers de las peticiones subsiguientes

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/User.model.js` - Modelo de usuario
- `src/controllers/auth.controller.js` - Lógica de autenticación
- `src/routes/auth.routes.js` - Rutas de autenticación
- `src/middlewares/auth.middleware.js` - Middleware de verificación
- `src/app.js` - Configuración principal (CORS, rutas)
- `.env` - Variables de entorno

**Frontend:**
- `src/context/AuthContext.jsx` - Contexto de autenticación
- `src/components/Login.jsx` - Componente de login
- `src/api/axios.js` - Configuración de Axios
- `src/App.jsx` - Rutas protegidas

---

## 🚨 Reglas Importantes

1. **NO DUPLICAR CÓDIGO:** Si el login funciona, no crear nuevos archivos de autenticación
2. **NO CAMBIAR EL MODELO:** El modelo User.model.js tiene una estructura específica con sub-esquemas, no modificar sin necesidad
3. **MANTENER CONSISTENCIA:** Usar siempre la misma estructura de respuesta del backend
4. **VERIFICAR ANTES DE CAMBIAR:** Antes de modificar código, verificar qué está funcionando actualmente

---

## 📚 Notas Adicionales

- El sistema usa JWT (JSON Web Tokens) para mantener la sesión
- Los tokens expiran según JWT_EXPIRES_IN (por defecto 7 días)
- El modelo User tiene compatibilidad con versiones anteriores usando virtuals
- La estructura del User es modular con sub-esquemas para mejor organización
