# Sincronización en Tiempo Real: Notificaciones en Múltiples Ubicaciones

## 📋 Problema a Resolver

Cuando una acción (aprobar, rechazar, eliminar) se realiza desde **dos ubicaciones diferentes** en la aplicación:
- **Bell de notificaciones** (navbar)
- **Sección específica** (ej: cards de solicitudes pendientes)

Ambas ubicaciones deben sincronizarse automáticamente en tiempo real para evitar:
- ❌ Acciones duplicadas (aprobar dos veces)
- ❌ Conflictos de estado
- ❌ Información desactualizada

---

## 🎯 Caso de Uso: Fundación

### Escenario
Usuario#2 recibe una solicitud de fundación que aparece en:
1. **Bell de notificaciones** → Botones Aceptar/Rechazar
2. **Sección "Solicitudes Pendientes"** → Cards con botones Aceptar/Rechazar

### Flujo Deseado
Si Usuario#2 aprueba desde **cualquiera de las dos ubicaciones**:
- ✅ La notificación desaparece del bell
- ✅ La card desaparece de "Solicitudes Pendientes"
- ✅ Usuario#1 recibe notificación de aprobación
- ✅ Estado de Usuario#1 se actualiza a "APROBADO"

**Todo en tiempo real, sin refrescar.**

---

## 🔧 Implementación Técnica

### Backend

#### 1. Emitir Eventos Socket.IO Cuando se Modifica el Estado

```javascript
// En el endpoint de aprobar/rechazar
const io = req.app.get('io');

// 1. Eliminar notificación original
const deletedNotifications = await Notification.deleteMany({
  receptor: aprobadorId,
  emisor: solicitante._id,
  tipo: 'solicitud_fundacion'
});

// 2. Notificar al aprobador que la notificación fue eliminada
if (io && deletedNotifications.deletedCount > 0) {
  io.to(`notifications:${aprobadorId}`).emit('notificationDeleted', {
    emisorId: solicitante._id,
    tipo: 'solicitud_fundacion'
  });
}

// 3. Crear nueva notificación para el solicitante
const nuevaNotificacion = await Notification.create({
  receptor: solicitante._id,
  emisor: aprobadorId,
  tipo: 'solicitud_fundacion_aprobada',
  contenido: '...'
});

// 4. Enviar notificación al solicitante
if (io) {
  const notifCompleta = await Notification.findById(nuevaNotificacion._id)
    .populate('emisor', 'nombres apellidos social.fotoPerfil');
  
  io.to(`notifications:${solicitante._id}`).emit('newNotification', notifCompleta);
}

// 5. BROADCAST: Actualizar todas las listas en tiempo real
io.emit('fundacion:solicitudActualizada', {
  userId: solicitante._id,
  accion: 'aprobada',
  solicitud: {
    _id: solicitante._id,
    // ... datos completos
  }
});
```

#### Eventos Clave:
1. **`notificationDeleted`** → Elimina notificación del bell del aprobador
2. **`newNotification`** → Agrega notificación al bell del solicitante
3. **`fundacion:solicitudActualizada`** → Actualiza listas/cards en todas las ubicaciones

---

### Frontend

#### 2. Listeners en el Hook de Notificaciones (Bell)

```javascript
// src/features/notificaciones/hooks/useNotifications.js
import { getSocket } from '../../../shared/lib/socket';

useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  // Escuchar cuando una notificación es eliminada
  socket.on('notificationDeleted', (data) => {
    logger.log('🗑️ Notificación eliminada:', data);
    setNotifications(prev => prev.filter(n => {
      const emisorId = n.emisor?._id || n.emisor;
      return !(String(emisorId) === String(data.emisorId) && n.tipo === data.tipo);
    }));
  });

  return () => {
    socket.off('notificationDeleted');
  };
}, [userId]);
```

#### 3. Listeners en el Hook de la Sección Específica

```javascript
// src/features/iglesias/hooks/useFundacion.js
import { getSocket } from '../../../shared/lib/socket';

// Listener 1: Agregar nuevas solicitudes cuando llegan
useEffect(() => {
  const socket = getSocket();
  if (!socket || !user) return;

  const handleNewNotification = (notification) => {
    if (notification.tipo === 'solicitud_fundacion' && 
        user?.fundacion?.estadoAprobacion === 'aprobado') {
      cargarSolicitudesPendientes(); // Recargar lista
    }
  };

  socket.on('newNotification', handleNewNotification);
  return () => socket.off('newNotification', handleNewNotification);
}, [user, cargarSolicitudesPendientes]);

// Listener 2: Actualizar cuando se aprueba/rechaza
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const handleSolicitudActualizada = (data) => {
    // Remover de la lista si fue aprobada/rechazada
    setSolicitudesPendientes(prev => 
      prev.filter(s => s._id !== data.userId)
    );
    
    // Recargar para sincronizar
    if (user?.fundacion?.estadoAprobacion === 'aprobado') {
      cargarSolicitudesPendientes();
    }
  };

  socket.on('fundacion:solicitudActualizada', handleSolicitudActualizada);
  return () => socket.off('fundacion:solicitudActualizada', handleSolicitudActualizada);
}, [user, cargarSolicitudesPendientes]);

// Listener 3: Actualizar estado del PROPIO usuario
useEffect(() => {
  const socket = getSocket();
  if (!socket || !user) return;

  const handleMiSolicitudActualizada = (data) => {
    if (data.userId === user._id) {
      const updatedUser = {
        ...user,
        fundacion: {
          ...user.fundacion,
          estadoAprobacion: data.solicitud.fundacion.estadoAprobacion,
          // ... otros campos
        }
      };
      updateUser(updatedUser);
    }
  };

  socket.on('fundacion:solicitudActualizada', handleMiSolicitudActualizada);
  return () => socket.off('fundacion:solicitudActualizada', handleMiSolicitudActualizada);
}, [user, updateUser]);
```

---

## ✅ Checklist de Implementación

### Backend
- [ ] **Identificar el endpoint** que modifica el estado
- [ ] **Obtener instancia de Socket.IO:** `const io = req.app.get('io')`
- [ ] **Emitir evento de eliminación** si se borra una notificación:
  ```javascript
  io.to(`notifications:${userId}`).emit('notificationDeleted', {
    emisorId: ...,
    tipo: '...'
  });
  ```
- [ ] **Emitir evento de nueva notificación** si se crea una:
  ```javascript
  io.to(`notifications:${userId}`).emit('newNotification', notificacion);
  ```
- [ ] **Emitir broadcast de actualización** para sincronizar listas:
  ```javascript
  io.emit('nombreModulo:accionRealizada', {
    userId: ...,
    accion: 'aprobada/rechazada/eliminada',
    datos: { ... }
  });
  ```

### Frontend - Hook de Notificaciones (Bell)
- [ ] **Importar getSocket:** `import { getSocket } from '../../../shared/lib/socket'`
- [ ] **Crear useEffect** con listener de `notificationDeleted`
- [ ] **Filtrar notificaciones** cuando se recibe el evento
- [ ] **Limpiar listener** en el return del useEffect

### Frontend - Hook de la Sección Específica
- [ ] **Importar getSocket:** `import { getSocket } from '../../../shared/lib/socket'`
- [ ] **Crear useEffect** con listener de `newNotification`
  - Recargar lista cuando llega nueva notificación del tipo específico
- [ ] **Crear useEffect** con listener de `nombreModulo:accionRealizada`
  - Actualizar lista local (filtrar elementos)
  - Recargar desde backend para sincronizar
- [ ] **Si aplica:** Crear listener adicional para actualizar estado del usuario actual
- [ ] **Limpiar todos los listeners** en los returns

---

## 🚨 Errores Comunes a Evitar

### 1. ❌ Usar `window.socket` en lugar de `getSocket()`
**Problema:** `window.socket` puede no existir cuando se ejecuta el useEffect.

**Solución:**
```javascript
// ❌ MAL
const socket = window.socket;

// ✅ BIEN
import { getSocket } from '../../../shared/lib/socket';
const socket = getSocket();
```

### 2. ❌ No verificar que el socket existe
**Problema:** El código falla si el socket no está disponible.

**Solución:**
```javascript
const socket = getSocket();
if (!socket) {
  logger.warn('⚠️ Socket no disponible');
  return;
}
```

### 3. ❌ No limpiar los listeners
**Problema:** Memory leaks y listeners duplicados.

**Solución:**
```javascript
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;
  
  socket.on('evento', handler);
  
  return () => {
    socket.off('evento', handler); // ✅ IMPORTANTE
  };
}, [dependencies]);
```

### 4. ❌ Dependencias incorrectas en useEffect
**Problema:** El listener captura valores "congelados" de las variables.

**Solución:**
```javascript
// ❌ MAL - cargarSolicitudes no está en dependencias
useEffect(() => {
  socket.on('evento', () => cargarSolicitudes());
}, []);

// ✅ BIEN - incluir todas las funciones usadas
useEffect(() => {
  socket.on('evento', () => cargarSolicitudes());
}, [cargarSolicitudes]);

// ✅ MEJOR - usar useCallback para funciones
const cargarSolicitudes = useCallback(async () => {
  // ...
}, []);
```

### 5. ❌ No usar `useCallback` para funciones que se pasan como dependencias
**Problema:** El useEffect se ejecuta infinitamente.

**Solución:**
```javascript
// ✅ Envolver función en useCallback
const cargarSolicitudes = useCallback(async () => {
  const response = await service.getSolicitudes();
  setSolicitudes(response.data);
}, []); // Dependencias vacías si no usa variables externas
```

---

## 📊 Diagrama de Flujo

```
Usuario#2 aprueba desde Card
         ↓
Backend: aprobarSolicitud()
         ↓
    ┌────────────────────────────────┐
    │ 1. Eliminar notificación       │
    │ 2. Emit: notificationDeleted   │ → Bell de Usuario#2
    │ 3. Crear nueva notificación    │
    │ 4. Emit: newNotification       │ → Bell de Usuario#1
    │ 5. Emit: solicitudActualizada  │ → Todas las listas
    └────────────────────────────────┘
         ↓
Frontend: Listeners
    ┌─────────────────────────────────────┐
    │ useNotifications (Bell Usuario#2)   │
    │ → notificationDeleted               │
    │ → Elimina del bell                  │
    ├─────────────────────────────────────┤
    │ useNotifications (Bell Usuario#1)   │
    │ → newNotification                   │
    │ → Agrega al bell                    │
    ├─────────────────────────────────────┤
    │ useFundacion (Cards Usuario#2)      │
    │ → solicitudActualizada              │
    │ → Elimina card de la lista          │
    ├─────────────────────────────────────┤
    │ useFundacion (Estado Usuario#1)     │
    │ → solicitudActualizada              │
    │ → Actualiza estado a "APROBADO"    │
    └─────────────────────────────────────┘
```

---

## 🎯 Aplicación a Otros Módulos

Esta misma estrategia se puede aplicar a:
- **Solicitudes de amistad** (bell + sección de amigos)
- **Solicitudes de grupos** (bell + sección de grupos)
- **Solicitudes de iglesias** (bell + sección de iglesias)
- **Mensajes** (bell + chat)

**Patrón general:**
1. Backend emite 3 eventos: `deleted`, `new`, `updated`
2. Hook de notificaciones escucha `deleted` y `new`
3. Hook del módulo escucha `new` y `updated`
4. Todos usan `getSocket()` y limpian listeners

---

## 📝 Resumen

Para sincronizar notificaciones en múltiples ubicaciones:

**Backend:**
- Emitir `notificationDeleted` cuando se elimina
- Emitir `newNotification` cuando se crea
- Emitir `modulo:accionRealizada` para broadcast

**Frontend:**
- Usar `getSocket()` en lugar de `window.socket`
- Crear listeners en ambos hooks (notificaciones + módulo)
- Usar `useCallback` para funciones
- Incluir dependencias correctas
- Limpiar listeners en cleanup

**Resultado:**
✅ Sincronización perfecta en tiempo real entre todas las ubicaciones
