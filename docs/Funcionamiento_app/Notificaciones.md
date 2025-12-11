# Notificaciones - Sistema de Notificaciones en Tiempo Real

## 📋 Descripción General
El sistema de notificaciones informa a los usuarios sobre acciones relevantes: likes, comentarios, solicitudes de amistad, solicitudes de grupo, etc.

---

## � REGLAS CRÍTICAS - LEER PRIMERO

> [!IMPORTANT]
> **REGLA #1: TODA NOTIFICACIÓN DEBE REDIRIGIR A SU SECCIÓN CORRESPONDIENTE**
> 
> Cuando un usuario hace clic en una notificación, DEBE ser redirigido a la sección específica donde puede ver o actuar sobre esa notificación.

### Ejemplos de Redirección Correcta:

| Tipo de Notificación | Debe Redirigir A |
|----------------------|------------------|
| `solicitud_grupo` | `/Mis_grupos/{groupId}` con pestaña de miembros abierta |
| `promocion_admin_grupo` | `/Mis_grupos/{groupId}` con pestaña de miembros abierta |
| `solicitud_grupo_aprobada` | `/Mis_grupos/{groupId}` |
| `nuevo_miembro_grupo` | `/Mis_grupos/{groupId}` con pestaña de miembros abierta |
| `evento` (reunión) | `/Mis_reuniones` con scroll a la reunión específica |
| `solicitud_amistad` | `/perfil/{userId}` del solicitante |
| `like_post` | `/publicaciones/{postId}` o feed con scroll al post |
| `comentario_post` | `/publicaciones/{postId}` con scroll al comentario |
| `solicitud_iglesia` | `/iglesias/{iglesiaId}` con pestaña de solicitudes |

### Implementación en Frontend:

**Archivo:** `NotificationsDropdown.jsx` - función `handleProfileClick`

```javascript
const handleProfileClick = (notificacion) => {
  // Marcar como leída
  if (!notificacion.leido) {
    markAsRead(notificacion._id);
  }

  // SIEMPRE verificar el tipo y redirigir a la sección correcta
  
  // Ejemplo: Notificaciones de grupo
  if (notificacion.tipo === 'promocion_admin_grupo') {
    const groupId = notificacion.referencia?.id?._id || notificacion.referencia?.id;
    navigate(`/Mis_grupos/${groupId}`, {  // ⚠️ IMPORTANTE: Usar la ruta correcta
      state: { openMembersTab: true }
    });
    setOpen(false);
    return;
  }
  
  // Ejemplo: Notificaciones de reunión
  if (notificacion.tipo === 'evento' && notificacion.metadata?.meetingId) {
    navigate('/Mis_reuniones', {
      state: { scrollToMeetingId: notificacion.metadata.meetingId }
    });
    setOpen(false);
    return;
  }
  
  // ... más tipos
};
```

### ⚠️ Errores Comunes de Navegación:

#### Error 1: Ruta Incorrecta
**Síntoma:** La notificación navega pero lleva al home o página 404

**Causa:** Usar ruta incorrecta (ej: `/grupos/{id}` en lugar de `/Mis_grupos/{id}`)

**Solución:** Verificar las rutas exactas en tu `routes.jsx`:
```javascript
// ❌ INCORRECTO
navigate(`/grupos/${groupId}`)

// ✅ CORRECTO
navigate(`/Mis_grupos/${groupId}`)
```

#### Error 2: ID No Disponible
**Síntoma:** Console muestra "Navegando a grupo: undefined"

**Causa:** `referencia.id` no está poblado o no existe

**Solución:** Verificar múltiples fuentes del ID:
```javascript
const groupId = notificacion.referencia?.id?._id || 
                notificacion.referencia?.id ||
                notificacion.metadata?.groupId;
```

#### Error 3: No Abre la Pestaña Correcta
**Síntoma:** Navega al grupo pero no abre la pestaña de miembros

**Causa:** La página de destino no lee `location.state`

**Solución:** En la página del grupo, agregar:
```javascript
const location = useLocation();

useEffect(() => {
  if (location.state?.openMembersTab) {
    setActiveTab('members'); // o el nombre de tu pestaña
  }
}, [location.state]);
```

### Datos Necesarios para Navegación:

Cada notificación DEBE incluir en `referencia` o `metadata`:
- **ID del recurso:** `referencia.id` (grupo, post, iglesia, etc.)
- **Metadata adicional:** `metadata.meetingId`, `metadata.postId`, etc.

---

## �🔧 Componentes Principales

### Backend

#### 1. **Modelo de Notificación**
**Archivo:** `src/models/Notification.model.js`

**Estructura de Datos Requerida:**

```javascript
{
  // Usuario que RECIBE la notificación
  destinatario: ObjectId (ref: 'User'),
  
  // Usuario que GENERA la notificación
  emisor: {
    type: ObjectId,
    ref: 'User',
    // IMPORTANTE: Debe popularse con:
    // - nombres.primero
    // - apellidos.primero
    // - social.fotoPerfil
  },
  
  // Tipo de notificación
  tipo: String, // 'like', 'comment', 'friend_request', 'group_request', etc.
  
  // Referencia al contenido relacionado
  publicacion: ObjectId (ref: 'Post'),
  grupo: ObjectId (ref: 'Group'),
  comentario: ObjectId (ref: 'Comment'),
  
  // Mensaje de la notificación
  mensaje: String,
  
  // Estado
  leida: Boolean,
  
  // Fecha
  createdAt: Date
}
```

#### 2. **Controlador de Notificaciones**
**Archivo:** `src/controllers/notification.controller.js`

**Funciones Críticas:**

**`getNotifications(req, res)`**
```javascript
// ❌ INCORRECTO - No popula datos del emisor
const notificaciones = await Notification.find({ destinatario: userId });

// ✅ CORRECTO - Popula todos los datos necesarios
const notificaciones = await Notification.find({ destinatario: userId })
  .populate({
    path: 'emisor',
    select: 'nombres apellidos social.fotoPerfil username'
  })
  .populate('publicacion')
  .sort({ createdAt: -1 });
```

**`createNotification(emisorId, destinatarioId, tipo, data)`**
```javascript
// Crear notificación con todos los datos necesarios
const notificacion = await Notification.create({
  emisor: emisorId,
  destinatario: destinatarioId,
  tipo: tipo,
  publicacion: data.publicacionId,
  mensaje: data.mensaje,
  leida: false
});

// IMPORTANTE: Popula antes de emitir por Socket.IO
const notificacionPopulada = await Notification.findById(notificacion._id)
  .populate({
    path: 'emisor',
    select: 'nombres apellidos social.fotoPerfil username'
  });

// Emitir por Socket.IO
io.to(destinatarioId).emit('nueva-notificacion', notificacionPopulada);
```

#### 3. **Rutas de Notificaciones**
**Archivo:** `src/routes/notification.routes.js`

**Endpoints:**
- `GET /api/notificaciones` - Obtener todas las notificaciones
- `GET /api/notificaciones/:id` - Obtener una notificación específica
- `PUT /api/notificaciones/:id/read` - Marcar como leída
- `DELETE /api/notificaciones/:id` - Eliminar notificación

#### 4. **Socket.IO - Emisión de Notificaciones**
**Archivo:** `src/socket/notificationHandler.js`

**Eventos:**
- `nueva-notificacion` - Cuando se crea una notificación
- `notificacion-leida` - Cuando se marca como leída

### Frontend

#### 1. **Componente de Notificaciones**
**Archivo:** `src/components/NotificationCard.jsx`

**Datos que DEBE Mostrar:**

```javascript
// ✅ CORRECTO - Usar estructura UserV2
const nombreCompleto = `${notificacion.emisor?.nombres?.primero || ''} ${notificacion.emisor?.apellidos?.primero || ''}`.trim();
const fotoPerfil = notificacion.emisor?.social?.fotoPerfil;
const username = notificacion.emisor?.username;

// ❌ INCORRECTO - Estructura antigua
const nombreCompleto = notificacion.emisor?.nombre; // undefined en UserV2
```

**Ejemplo de Componente:**
```jsx
<div className="notification-card">
  {/* Foto de perfil */}
  {fotoPerfil ? (
    <img src={fotoPerfil} alt={nombreCompleto} />
  ) : (
    <div className="avatar-inicial">
      {notificacion.emisor?.nombres?.primero?.charAt(0)}
    </div>
  )}
  
  {/* Nombre y mensaje */}
  <div className="notification-content">
    <span className="nombre">{nombreCompleto}</span>
    <span className="mensaje">{notificacion.mensaje}</span>
    <span className="tiempo">{formatearTiempo(notificacion.createdAt)}</span>
  </div>
</div>
```

---

## ⚠️ Errores Comunes y Soluciones

### 1. **Muestra "Usuario" en lugar del Nombre Real**

**Problema Actual:**
```
Usuario (ahora)
dio like a tu publicación
```

**Debe Mostrar:**
```
Ibrahim Jiménez (ahora)
dio like a tu publicación
```

**Causas:**
- El campo `emisor` no está siendo populado en el backend
- Se está usando `notificacion.emisor.nombre` en lugar de `notificacion.emisor.nombres.primero`
- El populate no incluye los campos necesarios

**Solución Backend:**
```javascript
// En notification.controller.js - getNotifications()
const notificaciones = await Notification.find({ destinatario: userId })
  .populate({
    path: 'emisor',
    select: 'nombres apellidos social.fotoPerfil username' // ✅ Incluir todos los campos
  })
  .sort({ createdAt: -1 });
```

**Solución Frontend:**
```javascript
// En NotificationCard.jsx
const getNombreCompleto = (emisor) => {
  if (!emisor) return 'Usuario';
  const nombre = emisor.nombres?.primero || '';
  const apellido = emisor.apellidos?.primero || '';
  return `${nombre} ${apellido}`.trim() || emisor.username || 'Usuario';
};
```

### 2. **No Se Muestra la Foto de Perfil**

**Causas:**
- El campo `social.fotoPerfil` no está siendo populado
- La URL de la foto es inválida o null
- No se está accediendo correctamente a `emisor.social.fotoPerfil`

**Solución:**
```javascript
// Backend - Asegurarse de incluir en el populate
.populate({
  path: 'emisor',
  select: 'nombres apellidos social.fotoPerfil username'
})

// Frontend - Usar con fallback
const fotoPerfil = notificacion.emisor?.social?.fotoPerfil;

{fotoPerfil ? (
  <img src={fotoPerfil} alt="Avatar" className="notification-avatar" />
) : (
  <div className="avatar-placeholder">
    {notificacion.emisor?.nombres?.primero?.charAt(0).toUpperCase() || 'U'}
  </div>
)}
```

### 3. **Notificaciones No Llegan en Tiempo Real**

**Causas:**
- Socket.IO no está emitiendo el evento
- El usuario no está conectado al socket
- La notificación no está siendo populada antes de emitir

**Solución:**
```javascript
// En el controlador donde se crea la notificación (ej: post.controller.js - darLike)

// 1. Crear la notificación
const notificacion = await Notification.create({
  emisor: req.user._id,
  destinatario: post.autor,
  tipo: 'like',
  publicacion: postId,
  mensaje: 'dio like a tu publicación'
});

// 2. Popula ANTES de emitir
const notificacionPopulada = await Notification.findById(notificacion._id)
  .populate({
    path: 'emisor',
    select: 'nombres apellidos social.fotoPerfil username'
  })
  .populate('publicacion');

// 3. Emitir por Socket.IO
const io = req.app.get('io');
io.to(post.autor.toString()).emit('nueva-notificacion', notificacionPopulada);
```

### 4. **Mensaje Genérico en Lugar de Personalizado**

**Problema:**
```
Usuario realizó una acción
```

**Debe Mostrar:**
```
Ibrahim Jiménez dio like a tu publicación
Ibrahim Jiménez comentó en tu publicación
María García aceptó tu solicitud de amistad
```

**Solución:**
```javascript
// Backend - Crear mensajes específicos según el tipo
const mensajes = {
  like: 'dio like a tu publicación',
  comment: 'comentó en tu publicación',
  friend_request: 'te envió una solicitud de amistad',
  friend_accept: 'aceptó tu solicitud de amistad',
  group_request: 'solicitó unirse a tu grupo',
  group_accept: 'aceptó tu solicitud para unirse al grupo'
};

await Notification.create({
  emisor: req.user._id,
  destinatario: destinatarioId,
  tipo: tipo,
  mensaje: mensajes[tipo] || 'realizó una acción'
});
```

### 5. **Datos Desactualizados en Notificaciones**

**Causas:**
- El frontend no está actualizando el estado al recibir notificaciones
- Socket.IO no está configurado correctamente

**Solución:**
```javascript
// Frontend - useEffect para escuchar notificaciones
useEffect(() => {
  if (!socket) return;
  
  socket.on('nueva-notificacion', (notificacion) => {
    // Actualizar estado de notificaciones
    setNotificaciones(prev => [notificacion, ...prev]);
    
    // Actualizar contador
    setContadorNoLeidas(prev => prev + 1);
    
    // Mostrar toast/alerta (opcional)
    toast.info(`${notificacion.emisor.nombres.primero} ${notificacion.mensaje}`);
  });
  
  return () => socket.off('nueva-notificacion');
}, [socket]);
```

---

## 📊 Tipos de Notificaciones y Sus Datos

### **1. Like en Publicación**
```javascript
{
  tipo: 'like',
  emisor: userId,           // Quien dio like
  destinatario: autorId,    // Autor de la publicación
  publicacion: postId,
  mensaje: 'dio like a tu publicación'
}
```

**Frontend debe mostrar:**
- Foto de perfil del emisor
- Nombre completo: "Ibrahim Jiménez"
- Mensaje: "dio like a tu publicación"
- Tiempo: "ahora", "hace 5 min", etc.

### **2. Comentario en Publicación**
```javascript
{
  tipo: 'comment',
  emisor: userId,
  destinatario: autorId,
  publicacion: postId,
  comentario: commentId,
  mensaje: 'comentó en tu publicación'
}
```

### **3. Solicitud de Amistad**
```javascript
{
  tipo: 'friend_request',
  emisor: userId,
  destinatario: amigoId,
  mensaje: 'te envió una solicitud de amistad'
}
```

---

## 📦 Notificaciones de Grupos - Guía Completa

Esta sección documenta TODAS las notificaciones relacionadas con grupos y qué información deben mostrar.

---

### **1. Solicitud para Unirse a Grupo**

**Tipo:** `solicitud_grupo`

**Quién la recibe:** Administradores y creador del grupo

**Estructura Backend:**
```javascript
{
  receptor: adminId,
  emisor: userId,              // Usuario que solicita unirse
  tipo: 'solicitud_grupo',
  contenido: 'solicitó unirse al grupo',
  referencia: {
    tipo: 'Group',
    id: groupId
  }
}
```

**Populate Requerido:**
```javascript
await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil username');
await notification.populate('referencia.id', 'nombre imagen');
```

**Lo que DEBE mostrar el Frontend:**
```
[Foto de Ibrahim] Ibrahim Jiménez solicitó unirse al grupo "Desarrolladores DEGADER"
[Botón Aceptar] [Botón Rechazar]
```

**Datos Necesarios:**
- ✅ Foto del solicitante: `emisor.social.fotoPerfil`
- ✅ Nombre del solicitante: `emisor.nombres.primero + emisor.apellidos.primero`
- ✅ Nombre del grupo: `referencia.id.nombre`
- ✅ Imagen del grupo: `referencia.id.imagen` (opcional)

---

### **2. Solicitud de Grupo Aprobada**

**Tipo:** `solicitud_grupo_aprobada`

**Quién la recibe:** Usuario que solicitó unirse

**Estructura Backend:**
```javascript
{
  receptor: solicitanteId,
  emisor: adminId,             // Admin que aprobó
  tipo: 'solicitud_grupo_aprobada',
  contenido: 'aprobó tu solicitud para unirse al grupo',
  referencia: {
    tipo: 'Group',
    id: groupId
  }
}
```

**Populate Requerido:**
```javascript
await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');
await notification.populate('referencia.id', 'nombre imagen');
```

**Lo que DEBE mostrar el Frontend:**
```
[Foto de Nahuel] Nahuel Jiménez aprobó tu solicitud para unirse al grupo "Desarrolladores DEGADER"
```

**Datos Necesarios:**
- ✅ Foto del admin: `emisor.social.fotoPerfil`
- ✅ Nombre del admin: `emisor.nombres.primero + emisor.apellidos.primero`
- ✅ Nombre del grupo: `referencia.id.nombre`
- ✅ Imagen del grupo: `referencia.id.imagen` (opcional)

---

### **3. Solicitud de Grupo Rechazada**

**Tipo:** `solicitud_grupo_rechazada`

**Quién la recibe:** Usuario que solicitó unirse

**Estructura Backend:**
```javascript
{
  receptor: solicitanteId,
  emisor: adminId,             // Admin que rechazó
  tipo: 'solicitud_grupo_rechazada',
  contenido: 'rechazó tu solicitud para unirse al grupo',
  referencia: {
    tipo: 'Group',
    id: groupId
  }
}
```

**Populate Requerido:**
```javascript
await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');
await notification.populate('referencia.id', 'nombre imagen');
```

**Lo que DEBE mostrar el Frontend:**
```
[Foto de Nahuel] Nahuel Jiménez rechazó tu solicitud para unirse al grupo "Desarrolladores DEGADER"
```

**Datos Necesarios:**
- ✅ Foto del admin: `emisor.social.fotoPerfil`
- ✅ Nombre del admin: `emisor.nombres.primero + emisor.apellidos.primero`
- ✅ Nombre del grupo: `referencia.id.nombre`

---

### **4. Promoción a Administrador de Grupo**

**Tipo:** `promocion_admin_grupo`

**Quién la recibe:** Usuario promovido a administrador

**Estructura Backend:**
```javascript
{
  receptor: miembroId,
  emisor: adminId,             // Admin que realizó la promoción
  tipo: 'promocion_admin_grupo',
  contenido: 'te nombró administrador del grupo',
  referencia: {
    tipo: 'Group',
    id: groupId
  }
}
```

**Populate Requerido:**
```javascript
await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil username');
await notification.populate('referencia.id', 'nombre imagen');
```

**Lo que DEBE mostrar el Frontend:**
```
[Foto de Nahuel] Nahuel Jiménez te nombró administrador del grupo "Desarrolladores DEGADER"
```

**Datos Necesarios:**
- ✅ Foto del admin que promovió: `emisor.social.fotoPerfil`
- ✅ Nombre del admin: `emisor.nombres.primero + emisor.apellidos.primero`
- ✅ **Nombre del grupo:** `referencia.id.nombre` (CRÍTICO para saber en qué grupo)
- ✅ Imagen del grupo: `referencia.id.imagen` (opcional)

---

### **5. Nuevo Miembro en Grupo**

**Tipo:** `nuevo_miembro_grupo`

**Quién la recibe:** Creador del grupo (cuando alguien se une a un grupo público)

**Estructura Backend:**
```javascript
{
  receptor: creadorId,
  emisor: nuevoMiembroId,
  tipo: 'nuevo_miembro_grupo',
  contenido: 'se unió a tu grupo',
  referencia: {
    tipo: 'Group',
    id: groupId
  }
}
```

**Populate Requerido:**
```javascript
await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');
await notification.populate('referencia.id', 'nombre imagen');
```

**Lo que DEBE mostrar el Frontend:**
```
[Foto de Ibrahim] Ibrahim Jiménez se unió a tu grupo "Desarrolladores DEGADER"
```

**Datos Necesarios:**
- ✅ Foto del nuevo miembro: `emisor.social.fotoPerfil`
- ✅ Nombre del nuevo miembro: `emisor.nombres.primero + emisor.apellidos.primero`
- ✅ Nombre del grupo: `referencia.id.nombre`

---

## ⚠️ Errores Comunes en Notificaciones de Grupos

### Error 1: Muestra "Usuario" sin nombre
**Causa:** No se populó `emisor` antes de emitir por Socket.IO

**Solución:**
```javascript
await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil username');
```

### Error 2: No muestra nombre del grupo
**Causa:** 
- No se populó `referencia.id`
- Frontend no accede a `referencia.id.nombre`

**Solución Backend:**
```javascript
await notification.populate('referencia.id', 'nombre imagen');
```

**Solución Frontend:**
```javascript
const nombreGrupo = notificacion.referencia?.id?.nombre || 'el grupo';
```

### Error 3: No muestra foto de perfil
**Causa:** Frontend accede a campo incorrecto

**Solución:**
```javascript
const foto = notificacion.emisor?.social?.fotoPerfil;
```

### Error 4: Click en notificación no navega al grupo
**Causa:** 
- Ruta incorrecta en `handleProfileClick`
- Tipo de notificación no manejado
- ID del grupo no disponible

**Solución:**
```javascript
// En NotificationsDropdown.jsx - handleProfileClick
if (notificacion.tipo === 'promocion_admin_grupo' || 
    notificacion.tipo === 'solicitud_grupo' ||
    notificacion.tipo === 'nuevo_miembro_grupo') {
  
  const groupId = notificacion.referencia?.id?._id || notificacion.referencia?.id;
  
  if (groupId) {
    // ⚠️ IMPORTANTE: Usar la ruta correcta de tu aplicación
    navigate(`/Mis_grupos/${groupId}`, {
      state: { openMembersTab: true }
    });
    setOpen(false);
    return;
  }
}
```

**Verificar:**
- ✅ La ruta en `routes.jsx` (puede ser `/grupos`, `/Mis_grupos`, etc.)
- ✅ El tipo de notificación está en el `if` statement
- ✅ `referencia.id` tiene el ID del grupo
- ✅ Console muestra: `👥 Navegando a grupo: {id}`

---

## ✅ Checklist de Verificación para Notificaciones de Grupos

Cuando implementes o debuggees notificaciones de grupos:

- [ ] El tipo de notificación está en el enum del modelo
- [ ] Se popula `emisor` con `nombres.primero apellidos.primero social.fotoPerfil`
- [ ] Se popula `referencia.id` con `nombre imagen`
- [ ] Se emite por Socket.IO **DESPUÉS** de popular
- [ ] El frontend accede a `emisor.nombres.primero` (no `emisor.nombre`)
- [ ] El frontend accede a `emisor.social.fotoPerfil` (no `emisor.fotoPerfil`)
- [ ] El frontend accede a `referencia.id.nombre` para el nombre del grupo
- [ ] El mensaje incluye el nombre del grupo para claridad
- [ ] Se muestra foto de perfil del emisor
- [ ] Se muestra nombre completo del emisor

---

## 🔗 Implementaciones de Referencia

**Solicitud de Grupo:**
- [groupController.js:370-396](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/controllers/groupController.js#L370-L396)

**Promoción a Admin:**
- [groupController.js:1358-1387](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/controllers/groupController.js#L1358-L1387)

**Construcción de Mensajes:**
- [notificationController.js:39-45](file:///C:/Users/Nahuel%20Jiménez/Documents/00_ProyectosWeb/Degader/DegaderSocialBackV2/src/controllers/notificationController.js#L39-L45)

---

## ✅ Checklist de Verificación

Cuando las notificaciones no funcionan correctamente:

- [ ] El modelo Notification tiene el campo `emisor` con ref a User
- [ ] El controlador popula `emisor` con `nombres`, `apellidos`, `social.fotoPerfil`
- [ ] El frontend accede a `emisor.nombres.primero` (no `emisor.nombre`)
- [ ] El frontend accede a `emisor.social.fotoPerfil` (no `emisor.fotoPerfil`)
- [ ] Socket.IO emite notificaciones DESPUÉS de popularlas
- [ ] El frontend escucha el evento `nueva-notificacion`
- [ ] Los mensajes son específicos según el tipo de notificación
- [ ] Se muestra foto de perfil o inicial como fallback
- [ ] Se muestra nombre completo, no "Usuario"

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/Notification.model.js` - Modelo de notificación
- `src/controllers/notification.controller.js` - Lógica de notificaciones
- `src/routes/notification.routes.js` - Rutas de notificaciones
- `src/controllers/post.controller.js` - Crea notificaciones de likes/comments
- `src/controllers/user.controller.js` - Crea notificaciones de amistad
- `src/controllers/group.controller.js` - Crea notificaciones de grupos
- `src/socket/index.js` - Configuración de Socket.IO

**Frontend:**
- `src/components/NotificationCard.jsx` - Tarjeta de notificación
- `src/components/NotificationList.jsx` - Lista de notificaciones
- `src/components/Navbar.jsx` - Icono de notificaciones con contador
- `src/context/SocketContext.jsx` - Contexto de Socket.IO
- `src/utils/notificationHelpers.js` - Funciones auxiliares

---

## 🚨 Reglas Importantes

1. **SIEMPRE POPULA EMISOR:** Nunca enviar notificaciones sin popula el campo `emisor`
2. **USA USERV2:** Acceder a `emisor.nombres.primero`, no `emisor.nombre`
3. **POPULA ANTES DE EMITIR:** Socket.IO debe recibir datos completos, no IDs
4. **MENSAJES ESPECÍFICOS:** Cada tipo de notificación debe tener un mensaje claro
5. **FALLBACKS:** Siempre tener fallback para foto y nombre
6. **NO DUPLICAR:** Si una notificación ya existe, no crear otra (verificar antes)

---

## 🔍 Funciones Auxiliares Recomendadas

**Archivo:** `src/utils/notificationHelpers.js`

```javascript
// Obtener nombre completo del emisor
export const getNombreEmisor = (emisor) => {
  if (!emisor) return 'Usuario';
  const nombre = emisor.nombres?.primero || '';
  const apellido = emisor.apellidos?.primero || '';
  return `${nombre} ${apellido}`.trim() || emisor.username || 'Usuario';
};

// Obtener foto de perfil
export const getFotoEmisor = (emisor) => {
  return emisor?.social?.fotoPerfil || null;
};

// Obtener inicial
export const getInicialEmisor = (emisor) => {
  return emisor?.nombres?.primero?.charAt(0).toUpperCase() || 'U';
};

// Formatear tiempo relativo
export const formatearTiempo = (fecha) => {
  const ahora = new Date();
  const diff = ahora - new Date(fecha);
  const minutos = Math.floor(diff / 60000);
  
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas}h`;
  
  const dias = Math.floor(horas / 24);
  return `hace ${dias}d`;
};
```

---

## 📚 Ejemplo Completo de Flujo

### Backend - Crear Notificación al Dar Like

```javascript
// En post.controller.js
export const darLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    
    const post = await Post.findById(postId);
    
    // Dar like
    post.likes.push(userId);
    await post.save();
    
    // Crear notificación (solo si no es el autor)
    if (post.autor.toString() !== userId.toString()) {
      const notificacion = await Notification.create({
        emisor: userId,
        destinatario: post.autor,
        tipo: 'like',
        publicacion: postId,
        mensaje: 'dio like a tu publicación',
        leida: false
      });
      
      // IMPORTANTE: Popula antes de emitir
      const notificacionPopulada = await Notification.findById(notificacion._id)
        .populate({
          path: 'emisor',
          select: 'nombres apellidos social.fotoPerfil username'
        })
        .populate('publicacion', 'contenido imagen');
      
      // Emitir por Socket.IO
      const io = req.app.get('io');
      io.to(post.autor.toString()).emit('nueva-notificacion', notificacionPopulada);
    }
    
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Frontend - Mostrar Notificación

```jsx
// NotificationCard.jsx
import { getNombreEmisor, getFotoEmisor, getInicialEmisor, formatearTiempo } from '../utils/notificationHelpers';

const NotificationCard = ({ notificacion }) => {
  const nombreCompleto = getNombreEmisor(notificacion.emisor);
  const fotoPerfil = getFotoEmisor(notificacion.emisor);
  const inicial = getInicialEmisor(notificacion.emisor);
  const tiempo = formatearTiempo(notificacion.createdAt);
  
  return (
    <div className={`notification-card ${!notificacion.leida ? 'no-leida' : ''}`}>
      <div className="notification-avatar">
        {fotoPerfil ? (
          <img src={fotoPerfil} alt={nombreCompleto} />
        ) : (
          <div className="avatar-inicial">{inicial}</div>
        )}
      </div>
      
      <div className="notification-content">
        <p>
          <span className="nombre">{nombreCompleto}</span>
          {' '}
          <span className="mensaje">{notificacion.mensaje}</span>
        </p>
        <span className="tiempo">{tiempo}</span>
      </div>
    </div>
  );
};
```

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0
