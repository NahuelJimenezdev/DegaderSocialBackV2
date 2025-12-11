# Mis Reuniones - Sistema de Gestión de Reuniones

## 📋 Descripción General
Sistema completo para crear, gestionar y participar en reuniones virtuales con notificaciones en tiempo real y actualización automática de estados.

---

## 🔧 Componentes Principales

### Backend

#### 1. **Modelo de Reunión**
**Archivo:** `src/models/Meeting.js`

**Estructura de Datos:**

```javascript
{
  // Creador de la reunión
  creator: ObjectId (ref: 'UserV2'),
  
  // Grupo asociado (opcional)
  group: ObjectId (ref: 'Group'),
  
  // Información básica
  title: String (max 100 caracteres),
  description: String (max 500 caracteres),
  
  // Fecha y hora
  date: Date,
  time: String, // Formato "HH:MM"
  duration: String, // Ej: "1 hora", "30 minutos"
  
  // Enlace de la reunión
  meetLink: String,
  
  // Tipo de reunión
  type: String, // 'administrative', 'training', 'community', 'personal'
  
  // Estado
  status: String, // 'upcoming', 'in-progress', 'completed', 'cancelled'
  
  // Participantes
  attendees: [ObjectId] (ref: 'UserV2'),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **Controlador de Reuniones**
**Archivo:** `src/controllers/meetingController.js`

**Funciones Principales:**

##### `createMeeting(req, res)`
Crea una nueva reunión y notifica a todos los participantes.

```javascript
// ✅ CORRECTO - Popula con campos específicos de UserV2
await newMeeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
await newMeeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');
```

##### `getMyMeetings(req, res)`
Obtiene todas las reuniones del usuario autenticado y actualiza automáticamente los estados según la fecha/hora.

```javascript
// Popula correctamente creator y attendees
const meetings = await Meeting.find({ attendees: userId })
  .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
  .populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil')
  .sort({ date: 1, time: 1 });
```

##### `joinMeeting(req, res)`
Permite a un usuario unirse a una reunión existente.

##### `cancelMeeting(req, res)`
Cancela una reunión (solo el creador puede hacerlo) y notifica a todos los participantes.

#### 3. **Rutas de Reuniones**
**Archivo:** `src/routes/meeting.routes.js`

**Endpoints:**
- `POST /api/reuniones` - Crear nueva reunión
- `GET /api/reuniones/me` - Obtener mis reuniones
- `PUT /api/reuniones/:id/join` - Unirse a una reunión
- `PUT /api/reuniones/:id/cancel` - Cancelar reunión

#### 4. **Socket.IO - Eventos en Tiempo Real**

**Eventos Emitidos:**
- `meetingUpdate` - Cuando se crea, actualiza o cambia el estado de una reunión
- `newNotification` - Cuando se crea una notificación de reunión

**Tipos de Eventos:**
```javascript
{
  type: 'create',      // Nueva reunión creada
  type: 'update',      // Reunión actualizada
  type: 'cancel',      // Reunión cancelada
  type: 'statusChange' // Cambio de estado automático
}
```

#### 5. **Búsqueda de Participantes**
**Endpoint:** `GET /api/usuarios/search?q=texto`
**Archivo:** `src/controllers/userController.js`

```javascript
// ✅ CORRECTO - Selecciona campos específicos de UserV2
.select('nombres.primero nombres.segundo apellidos.primero apellidos.segundo email social.fotoPerfil social.username')
```

**Respuesta Esperada:**
```json
{
  "success": true,
  "message": "Búsqueda completada",
  "data": [
    {
      "_id": "693a2e8f40e350a3be43291e",
      "nombres": {
        "primero": "Ibrahim",
        "segundo": "..."
      },
      "apellidos": {
        "primero": "Jiménez",
        "segundo": "..."
      },
      "email": "ibrahim@example.com",
      "social": {
        "fotoPerfil": "/uploads/avatars/...",
        "username": "ibrahim_j"
      }
    }
  ]
}
```

---

## ⚠️ Errores Comunes y Soluciones

### 1. **Muestra "undefined undefined" en Búsqueda de Participantes**

**Problema:**
Al buscar participantes para agregar a una reunión, aparece "undefined undefined" en lugar del nombre.

**Causas:**
- El endpoint `searchUsers` no selecciona correctamente los campos de UserV2
- El frontend accede incorrectamente a los campos anidados

**Solución Backend:**
```javascript
// ❌ INCORRECTO
.select('nombres apellidos email social.fotoPerfil')

// ✅ CORRECTO
.select('nombres.primero nombres.segundo apellidos.primero apellidos.segundo email social.fotoPerfil social.username')
```

**Solución Frontend:**
```javascript
// ✅ CORRECTO - Acceder a campos anidados de UserV2
const nombreCompleto = `${usuario.nombres?.primero || ''} ${usuario.apellidos?.primero || ''}`.trim();
const fotoPerfil = usuario.social?.fotoPerfil;
const username = usuario.social?.username;

// ❌ INCORRECTO - Estructura antigua
const nombreCompleto = usuario.nombre; // undefined en UserV2
```

### 2. **Participantes No Aparecen en la Reunión**

**Causas:**
- No se está populando el campo `attendees`
- El populate no incluye los campos necesarios

**Solución:**
```javascript
// ✅ CORRECTO
await meeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');
```

### 3. **Notificaciones No Llegan a los Participantes**

**Causas:**
- No se está emitiendo el evento por Socket.IO
- Los usuarios no están suscritos al canal correcto

**Solución:**
```javascript
// Emitir actualización de reunión
if (global.emitMeetingUpdate) {
  const attendeeIds = meeting.attendees.map(a => (a._id || a).toString());
  global.emitMeetingUpdate(attendeeIds, meeting, 'create');
}

// Crear notificación
await createMeetingNotification(
  attendeeId,
  creatorId,
  'meeting_created',
  `Te invitaron a la reunión "${title}"`,
  meeting._id
);
```

### 4. **Estado de Reunión No Se Actualiza Automáticamente**

**Causas:**
- El cron job no está configurado
- La lógica de actualización de estado tiene errores

**Solución:**
El controlador `getMyMeetings` actualiza automáticamente los estados:
- `upcoming` → `in-progress` cuando llega la hora
- `in-progress` → `completed` cuando termina la duración

---

## 📊 Flujo Completo de Creación de Reunión

### 1. Usuario Crea Reunión

**Frontend → Backend:**
```javascript
POST /api/reuniones
{
  "title": "Reunión de Equipo",
  "description": "Discutir proyecto",
  "date": "2024-12-15T00:00:00.000Z",
  "time": "14:00",
  "duration": "1 hora",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "type": "administrative",
  "attendees": ["userId1", "userId2", "userId3"]
}
```

### 2. Backend Procesa

```javascript
// 1. Crear reunión
const newMeeting = new Meeting({...});
await newMeeting.save();

// 2. Popula datos
await newMeeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
await newMeeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');

// 3. Emitir evento Socket.IO
global.emitMeetingUpdate(attendeeIds, newMeeting, 'create');

// 4. Crear notificaciones
for (const attendee of attendeesToNotify) {
  await createMeetingNotification(...);
}
```

### 3. Frontend Recibe Actualización

```javascript
// Socket.IO listener
socket.on('meetingUpdate', ({ type, meeting }) => {
  if (type === 'create') {
    // Agregar nueva reunión a la lista
    setMeetings(prev => [...prev, meeting]);
  }
});

socket.on('newNotification', (notification) => {
  // Mostrar notificación al usuario
  toast.info(`${notification.emisor.nombres.primero} ${notification.contenido}`);
});
```

---

## ✅ Checklist de Verificación

Cuando las reuniones no funcionan correctamente:

- [ ] El modelo Meeting usa `ref: 'UserV2'` para creator y attendees
- [ ] El controlador popula con `'nombres.primero apellidos.primero social.fotoPerfil'`
- [ ] El endpoint de búsqueda selecciona campos específicos de UserV2
- [ ] El frontend accede a `nombres.primero` y `apellidos.primero` (no `nombre`)
- [ ] Socket.IO emite eventos después de popula
- [ ] Las notificaciones se crean con el tipo correcto
- [ ] Los usuarios están suscritos a los canales de Socket.IO

---

## 🔗 Archivos Relacionados

**Backend:**
- [Meeting.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/models/Meeting.js) - Modelo de reunión
- [meetingController.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/controllers/meetingController.js) - Controlador de reuniones
- [meeting.routes.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/routes/meeting.routes.js) - Rutas de reuniones
- [userController.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/controllers/userController.js) - Búsqueda de usuarios
- [socketService.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/services/socketService.js) - Servicio de Socket.IO
- [meetingCron.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/utils/meetingCron.js) - Cron para recordatorios

---

## 🐛 Troubleshooting - Errores Comunes Resueltos

Esta sección documenta errores que se han presentado y sus soluciones, como referencia para el futuro.

### 1. ❌ "undefined undefined" en Búsqueda de Participantes

**Error:**
Al buscar participantes para agregar a una reunión, aparecía "undefined undefined" en lugar del nombre del usuario.

**Causa:**
El hook `useUserSearch.js` accedía a campos de la estructura antigua del modelo User (`u.nombre`, `u.apellido`) en lugar de la estructura UserV2 (`u.nombres.primero`, `u.apellidos.primero`).

**Solución:**

**Backend** - `userController.js` (línea 67):
```javascript
// ❌ ANTES
.select('nombres apellidos email social.fotoPerfil')

// ✅ DESPUÉS
.select('nombres.primero nombres.segundo apellidos.primero apellidos.segundo email social.fotoPerfil social.username')
```

**Frontend** - `useUserSearch.js` (líneas 26-31):
```javascript
// ❌ ANTES
const formatted = users.map((u) => ({
  id: u._id,
  name: `${u.nombre} ${u.apellido}`,  // Campos inexistentes en UserV2
  email: u.email,
  legajo: u.legajo,
}));

// ✅ DESPUÉS
const formatted = users.map((u) => ({
  id: u._id,
  name: `${u.nombres?.primero || ''} ${u.apellidos?.primero || ''}`.trim() || u.email || 'Usuario',
  email: u.email,
  avatar: u.social?.fotoPerfil,
  username: u.social?.username
}));
```

**Archivos Modificados:**
- [userController.js:67](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/controllers/userController.js#L67)
- [useUserSearch.js:26-31](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialFrontV2/src/features/reuniones/hooks/useUserSearch.js#L26-L31)

---

### 2. ❌ Error CORS y "Network Error" al Crear Reunión

**Error en Consola:**
```
Access to XMLHttpRequest at 'http://localhost:3001/api/meetings' from origin 'http://localhost:5173' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

POST http://localhost:3001/api/meetings net::ERR_FAILED
```

**Causa:**
El frontend estaba llamando a `/api/meetings` pero el backend usa `/api/reuniones` (en español). La ruta no existía, causando un error de CORS.

**Solución:**

**Frontend** - `meetingService.js`:
```javascript
// ❌ ANTES
createMeeting: async (meetingData) => {
  const response = await api.post('/meetings', meetingData);
}

getMyMeetings: async () => {
  const response = await api.get('/meetings/me');
}

cancelMeeting: async (meetingId) => {
  const response = await api.put(`/meetings/${meetingId}/cancel`);
}

// ✅ DESPUÉS
createMeeting: async (meetingData) => {
  const response = await api.post('/reuniones', meetingData);
}

getMyMeetings: async () => {
  const response = await api.get('/reuniones/me');
}

cancelMeeting: async (meetingId) => {
  const response = await api.put(`/reuniones/${meetingId}/cancel`);
}
```

**Archivo Modificado:**
- [meetingService.js](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialFrontV2/src/features/reuniones/services/meetingService.js)

**Rutas Correctas del Backend:**
- `POST /api/reuniones` - Crear reunión
- `GET /api/reuniones/me` - Obtener mis reuniones
- `PUT /api/reuniones/:id/cancel` - Cancelar reunión
- `PUT /api/reuniones/:id/join` - Unirse a reunión

---

### 3. ❌ "Internal React error: Expected static flag was missing"

**Error en Consola:**
```
ReunionesPage.jsx:250 Internal React error: Expected static flag was missing. 
Please notify the React team.
```

**Causa:**
Este error de React generalmente aparece cuando:
1. Hay un error de red (como el CORS) que interrumpe el ciclo de renderizado
2. Hay un problema con hooks condicionales o mal ordenados

**Solución:**
Al corregir el error de CORS (punto #2), este error de React desaparece automáticamente, ya que era un efecto secundario del error de red.

---

### 5. ❌ Error 404 en `/api/reuniones/me` - Ruta No Registrada

**Error en Consola:**
```
GET http://localhost:3001/api/reuniones/me 404 (Not Found)
Resource not found
```

**Causa:**
El backend tenía las rutas registradas como `/api/meetings` en `index.js` (línea 124), pero el frontend (después de la corrección) llamaba a `/api/reuniones`.

**Solución:**

**Backend** - `index.js` (línea 124):
```javascript
// ❌ ANTES
app.use('/api/meetings', meetingRoutes);

// ✅ DESPUÉS
app.use('/api/reuniones', meetingRoutes);
```

**Archivo Modificado:**
- [index.js:124](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/index.js#L124)

**Nota Importante:**
Este error ocurrió porque inicialmente el backend usaba rutas en inglés (`/api/meetings`) pero se decidió cambiar a español (`/api/reuniones`) para mantener consistencia con el resto de la API (`/api/publicaciones`, `/api/usuarios`, `/api/grupos`, etc.).

---

### 6. ⚠️ Checklist de Prevención

Para evitar estos errores en el futuro:

- [ ] **Siempre usar UserV2:** Acceder a `nombres.primero`, `apellidos.primero`, no `nombre`, `apellido`
- [ ] **Verificar rutas del API:** Asegurarse que frontend y backend usen las mismas rutas
- [ ] **Usar optional chaining:** Siempre usar `?.` para campos anidados
- [ ] **Probar en desarrollo:** Verificar la consola del navegador antes de hacer commit
- [ ] **Documentar cambios:** Actualizar esta sección cuando se encuentren nuevos errores

---

## 🚨 Reglas Importantes

1. **SIEMPRE USA USERV2:** Accede a `nombres.primero`, `apellidos.primero`, no `nombre`
2. **POPULA ANTES DE EMITIR:** Socket.IO debe recibir datos completos, no IDs
3. **SELECCIONA CAMPOS ESPECÍFICOS:** En búsquedas, usa `'nombres.primero nombres.segundo ...'`
4. **NOTIFICA A TODOS:** Cuando creas/cancelas reunión, notifica a todos los participantes
5. **ACTUALIZA ESTADOS:** El sistema actualiza automáticamente los estados según fecha/hora

---

**Última actualización:** Diciembre 2024  
**Versión:** 2.0
