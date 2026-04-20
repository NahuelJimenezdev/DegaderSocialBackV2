# Perfil - Visualización y Edición de Perfil de Usuario

## 📋 Descripción General
El sistema de perfil permite a los usuarios ver y editar su información personal, incluyendo foto de perfil, nombre, apellido, ciudad, fecha de registro, y otros datos.

---

## 🔧 Componentes Principales

### Backend

#### 1. **Modelo de Usuario (UserV2)**
**Archivo:** `src/models/User.model.js`

**Estructura de Datos del Perfil:**

```javascript
{
  // Información Personal
  nombres: {
    primero: String,    // Primer nombre
    segundo: String     // Segundo nombre (opcional)
  },
  apellidos: {
    primero: String,    // Primer apellido
    segundo: String     // Segundo apellido (opcional)
  },
  
  // Información Social
  social: {
    fotoPerfil: String,     // URL de la foto de perfil
    fotoBanner: String,     // URL del banner
    biografia: String       // Biografía del usuario
  },
  
  // Ubicación
  ubicacion: {
    ciudad: String,
    estado: String,
    pais: String
  },
  
  // Información de Cuenta
  email: String,
  username: String,
  fechaRegistro: Date,    // Fecha de cuando se unió
  
  // Información de Contacto
  telefono: {
    codigo: String,
    numero: String
  }
}
```

**Importante:** El modelo usa una estructura jerárquica. Para acceder a los datos:
- Nombre: `user.nombres.primero`
- Apellido: `user.apellidos.primero`
- Foto de perfil: `user.social.fotoPerfil`

#### 2. **Controlador de Usuario**
**Archivo:** `src/controllers/user.controller.js`

**Funciones Principales:**
- `getProfile(req, res)` - Obtiene el perfil del usuario
- `updateProfile(req, res)` - Actualiza datos del perfil
- `uploadAvatar(req, res)` - Sube/actualiza foto de perfil
- `getUserById(req, res)` - Obtiene perfil de otro usuario

#### 3. **Rutas de Usuario**
**Archivo:** `src/routes/user.routes.js`

**Endpoints:**
- `GET /api/usuarios/:id` - Obtener perfil de usuario
- `GET /api/usuarios/profile/me` - Obtener perfil propio
- `PUT /api/usuarios/profile` - Actualizar perfil
- `POST /api/usuarios/avatar` - Subir foto de perfil
- `PUT /api/usuarios/banner` - Actualizar banner

**⚠️ Importante:** El orden de las rutas es crítico. Las rutas específicas deben ir ANTES de las rutas con parámetros:
```javascript
// ✅ CORRECTO
router.get('/profile/me', getMyProfile);
router.get('/saved-posts', getSavedPosts);
router.get('/:id', getUserById);

// ❌ INCORRECTO - causará conflictos
router.get('/:id', getUserById);
router.get('/profile/me', getMyProfile);  // Nunca se alcanzará
```

#### 4. **Middleware de Autenticación**
**Archivo:** `src/middlewares/auth.middleware.js`

- Verifica que el usuario esté autenticado
- Adjunta `req.user` con los datos del usuario

### Frontend

#### 1. **Componente de Perfil**
**Archivo:** `src/components/Profile.jsx` o `src/pages/ProfilePage.jsx`

**Datos que Debe Mostrar:**
- ✅ Foto de perfil (`user.social.fotoPerfil`)
- ✅ Nombre completo (`user.nombres.primero + user.apellidos.primero`)
- ✅ Ciudad (`user.ubicacion.ciudad`)
- ✅ Fecha de registro (`user.fechaRegistro`)
- ✅ Biografía (`user.social.biografia`)
- ✅ Email (`user.email`)
- ✅ Username (`user.username`)

**Ejemplo de Uso:**
```javascript
// Obtener nombre completo
const nombreCompleto = `${user.nombres.primero} ${user.apellidos.primero}`;

// Obtener inicial del nombre
const inicial = user.nombres.primero?.charAt(0).toUpperCase();

// Obtener foto de perfil o usar inicial
const fotoPerfil = user.social?.fotoPerfil || null;
```

#### 2. **Componente de Edición de Perfil**
**Archivo:** `src/components/EditProfile.jsx`

**Campos Editables:**
- Foto de perfil
- Banner
- Nombre y apellido
- Biografía
- Ciudad, estado, país
- Teléfono

#### 3. **Contexto de Usuario**
**Archivo:** `src/context/UserContext.jsx` o `AuthContext.jsx`

**Funciones:**
- `getProfile()` - Obtiene datos del perfil
- `updateProfile(data)` - Actualiza el perfil
- `uploadAvatar(file)` - Sube nueva foto de perfil

---

## ⚠️ Errores Comunes y Soluciones

### 1. **Foto de Perfil No Se Muestra**
**Causas:**
- La URL de la foto es inválida o null
- No se está accediendo correctamente a `user.social.fotoPerfil`
- Problema con CORS al cargar la imagen

**Solución:**
```javascript
// Usar foto de perfil con fallback
const avatarUrl = user?.social?.fotoPerfil || '/default-avatar.png';

// O mostrar inicial si no hay foto
{user.social?.fotoPerfil ? (
  <img src={user.social.fotoPerfil} alt="Avatar" />
) : (
  <div className="avatar-inicial">
    {user.nombres?.primero?.charAt(0)}
  </div>
)}
```

### 2. **Nombre No Se Muestra Correctamente**
**Causas:**
- Se está usando `user.nombre` en lugar de `user.nombres.primero`
- Modelo antiguo vs nuevo (UserV2)

**Solución:**
```javascript
// ✅ CORRECTO - Modelo UserV2
const nombre = user.nombres.primero;
const apellido = user.apellidos.primero;

// ❌ INCORRECTO - Modelo antiguo
const nombre = user.nombre;  // undefined en UserV2
```

### 3. **Inicial No Se Muestra en Navbar**
**Causas:**
- El componente Navbar no está usando la estructura correcta
- No se está accediendo a `user.nombres.primero`

**Solución:**
- Verificar que el Navbar use: `user.nombres?.primero?.charAt(0).toUpperCase()`
- Asegurarse de que el contexto de autenticación esté proporcionando el usuario completo

### 4. **Datos No Se Actualizan en Tiempo Real**
**Causas:**
- No se está actualizando el estado después de editar
- Socket.IO no está emitiendo eventos de actualización
- El contexto no se está refrescando

**Solución:**
```javascript
// Después de actualizar el perfil
const updatedUser = await updateProfile(data);
setUser(updatedUser);  // Actualizar el estado local

// Emitir evento de Socket.IO
socket.emit('profile-updated', updatedUser);
```

### 5. **Error 400 al Actualizar Perfil**
**Causas:**
- Datos enviados no coinciden con el esquema del modelo
- Validación fallida en el backend

**Solución:**
- Verificar que los datos enviados tengan la estructura correcta:
```javascript
const profileData = {
  nombres: {
    primero: firstName,
    segundo: secondName
  },
  apellidos: {
    primero: lastName,
    segundo: secondLastName
  },
  social: {
    biografia: bio
  },
  ubicacion: {
    ciudad: city,
    estado: state,
    pais: country
  }
};
```

### 6. **Fecha de Registro No Se Muestra**
**Causas:**
- El campo `fechaRegistro` no existe
- No se está formateando la fecha correctamente

**Solución:**
```javascript
// Formatear fecha
const fechaUnion = new Date(user.fechaRegistro).toLocaleDateString('es-ES', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Mostrar: "Se unió en diciembre de 2024"
```

---

## 🔍 Dependencias Críticas

### Backend
```json
{
  "multer": "^1.4.5-lts.1",  // Para subir imágenes
  "cloudinary": "^1.37.0",   // Para almacenar imágenes (opcional)
  "mongoose": "^7.0.0"
}
```

### Frontend
```json
{
  "axios": "^1.4.0",
  "react": "^18.2.0",
  "socket.io-client": "^4.5.0"  // Para actualizaciones en tiempo real
}
```

---

## 📝 Archivos Relacionados

**Backend:**
- `src/models/User.model.js` - Modelo de usuario con estructura UserV2
- `src/controllers/user.controller.js` - Lógica de perfil
- `src/routes/user.routes.js` - Rutas de usuario
- `src/middlewares/auth.middleware.js` - Verificación de autenticación
- `src/middlewares/upload.middleware.js` - Manejo de subida de archivos

**Frontend:**
- `src/components/Profile.jsx` - Componente de visualización de perfil
- `src/components/EditProfile.jsx` - Componente de edición
- `src/components/Navbar.jsx` - Muestra inicial/foto en navbar
- `src/context/AuthContext.jsx` - Contexto de usuario autenticado
- `src/utils/userHelpers.js` - Funciones auxiliares para datos de usuario

---

## 🔗 Funciones Auxiliares Recomendadas

**Archivo:** `src/utils/userHelpers.js`

```javascript
// Obtener nombre completo
export const getFullName = (user) => {
  if (!user) return '';
  return `${user.nombres?.primero || ''} ${user.apellidos?.primero || ''}`.trim();
};

// Obtener inicial
export const getInitial = (user) => {
  return user?.nombres?.primero?.charAt(0).toUpperCase() || '?';
};

// Obtener avatar
export const getAvatar = (user) => {
  return user?.social?.fotoPerfil || null;
};

// Obtener ubicación
export const getLocation = (user) => {
  const { ciudad, estado, pais } = user?.ubicacion || {};
  return [ciudad, estado, pais].filter(Boolean).join(', ');
};
```

---

## ✅ Checklist de Verificación

Cuando hay problemas con el perfil, verificar:

- [ ] El modelo User.model.js usa la estructura UserV2 correcta
- [ ] Se está accediendo a `user.nombres.primero` (no `user.nombre`)
- [ ] Se está accediendo a `user.social.fotoPerfil` (no `user.fotoPerfil`)
- [ ] Las rutas en user.routes.js están en el orden correcto
- [ ] El middleware de autenticación está funcionando
- [ ] El contexto de autenticación proporciona el usuario completo
- [ ] Los componentes usan funciones auxiliares consistentes
- [ ] Socket.IO está emitiendo eventos de actualización de perfil
- [ ] La subida de imágenes está configurada correctamente

---

## 🚨 Reglas Importantes

1. **USAR ESTRUCTURA USERV2:** Siempre usar `user.nombres.primero`, no `user.nombre`
2. **NO DUPLICAR LÓGICA:** Usar funciones auxiliares compartidas para obtener nombre, avatar, etc.
3. **MANTENER CONSISTENCIA:** Todos los componentes deben usar la misma estructura
4. **ORDEN DE RUTAS:** Las rutas específicas SIEMPRE antes de las rutas con parámetros
5. **ACTUALIZACIONES EN TIEMPO REAL:** Emitir eventos de Socket.IO cuando se actualiza el perfil
6. **NO MODIFICAR EL MODELO:** El modelo User.model.js tiene una estructura específica, no cambiar sin necesidad

---

## 📊 Componentes que Usan Datos de Perfil

Los siguientes componentes dependen de los datos del perfil y deben usar la estructura correcta:

- **Navbar** - Muestra foto/inicial y nombre
- **Sidebar** - Muestra información del usuario
- **FriendCard** - Muestra amigos con foto y nombre
- **PostCard** - Muestra autor del post
- **CommentSection** - Muestra autor de comentarios
- **MessageList** - Muestra contactos
- **GroupMembers** - Muestra miembros del grupo
- **NotificationCard** - Muestra quién generó la notificación

**Todos estos componentes deben usar:**
- `user.nombres.primero` para el nombre
- `user.apellidos.primero` para el apellido
- `user.social.fotoPerfil` para la foto

---

## 📚 Notas Adicionales

- El sistema usa Socket.IO para actualizaciones en tiempo real
- Las imágenes se pueden almacenar en Cloudinary o en el servidor local
- El modelo User tiene virtuals para compatibilidad con código antiguo
- La estructura modular facilita el mantenimiento y evita errores
