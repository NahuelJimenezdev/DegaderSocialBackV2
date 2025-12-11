# Grupos - Sistema Completo de Grupos

## 📋 Descripción General

Sistema completo para crear y gestionar grupos con múltiples secciones: feed, chat, miembros, multimedia, archivos, enlaces, eventos y configuración. Incluye notificaciones en tiempo real, contadores de mensajes no leídos y solicitudes pendientes.

---

## 🎯 Página de Detalle del Grupo (GroupDetail)

### Secciones Disponibles

| Sección | ID | Descripción | Contador |
|---------|----|-----------| |
| Feed | `feed` | Publicaciones del grupo | Nuevos posts |
| Chat | `chat` | Mensajes del grupo | Mensajes no leídos |
| Detalle | `detail` | Información del grupo | - |
| Miembros | `members` | Lista de miembros y solicitudes | Solicitudes pendientes |
| Multimedia | `multimedia` | Fotos y videos | - |
| Archivos | `files` | Documentos compartidos | - |
| Enlaces | `links` | Enlaces compartidos | - |
| Destacados | `events` | Eventos importantes | - |
| Configuración | `settings` | Ajustes del grupo | - |

---

## � Contadores en Tiempo Real

### 1. Contador de Mensajes No Leídos

**Ubicación:** Badge en sección "Chat"

**Cómo Funciona:**
```javascript
// Se guarda timestamp de última visita en localStorage
const lastVisitKey = `group_chat_last_visit_${groupId}`;
localStorage.setItem(lastVisitKey, new Date().toISOString());

// Se cuentan mensajes después de ese timestamp
const unreadCount = messages.filter(msg =>
  new Date(msg.createdAt) > new Date(lastVisit) &&
  String(msg.author?._id) !== String(user?._id)
).length;
```

**Cuándo se Actualiza:**
- ✅ Al recibir nuevo mensaje por Socket.IO (`newGroupMessage`)
- ✅ Solo si el mensaje NO es del usuario actual
- ✅ Solo si NO estás en la sección de chat

**Cuándo se Resetea:**
- ✅ Al entrar a la sección de chat
- ✅ Se guarda nuevo timestamp en localStorage

---

### 2. Contador de Solicitudes Pendientes

**Ubicación:** Badge en sección "Miembros"

**Cómo Funciona:**
```javascript
const pendingRequestsCount = groupData?.joinRequests?.length || 
                             groupData?.solicitudesPendientes?.length || 0;
```

**Cuándo se Actualiza:**
- ✅ Al recibir notificación de `solicitud_grupo` por Socket.IO
- ✅ Se ejecuta `refetch()` para recargar datos del grupo
- ✅ El contador se actualiza automáticamente

---

### 3. Contador de Nuevos Posts

**Ubicación:** Badge en sección "Feed"

**Estado Actual:** Implementado en el código pero requiere lógica adicional

**Cómo Debería Funcionar:**
```javascript
// Socket listener para nuevos posts
socket.on('newGroupPost', (post) => {
  if (activeSection !== 'feed') {
    setNewPostsCount(prev => prev + 1);
  }
});

// Resetear al entrar al feed
useEffect(() => {
  if (activeSection === 'feed') {
    setNewPostsCount(0);
  }
}, [activeSection]);
```

---

## 🔐 Roles y Permisos

### Determinación del Rol

```javascript
const isOwner = String(groupData?.creador?._id) === String(user?._id);
const isAdmin = groupData?.administradores?.some(admin =>
  String(admin._id || admin) === String(user?._id)
);
const userRole = isOwner ? 'owner' : (isAdmin ? 'admin' : 'member');
```

### Permisos por Rol

| Acción | Owner | Admin | Member |
|--------|-------|-------|--------|
| Ver feed | ✅ | ✅ | ✅ |
| Enviar mensajes | ✅ | ✅ | ✅ |
| Publicar en feed | ✅ | ✅ | ✅ |
| Aceptar/Rechazar solicitudes | ✅ | ✅ | ❌ |
| Promover a admin | ✅ | ✅ | ❌ |
| Expulsar miembros | ✅ | ✅ | ❌ |
| Editar configuración | ✅ | ❌ | ❌ |
| Eliminar grupo | ✅ | ❌ | ❌ |

---

## 🔌 Eventos de Socket.IO

### Eventos que Escucha GroupDetail

```javascript
// Nuevo mensaje en el grupo
socket.on('newGroupMessage', (message) => {
  // Incrementa contador si no estás en chat
  if (activeSection !== 'chat') {
    setUnreadMessagesCount(prev => prev + 1);
  }
});

// Nueva notificación
socket.on('newNotification', (notification) => {
  // Si es solicitud de grupo, recargar datos
  if (notification.tipo === 'solicitud_grupo') {
    refetch();
  }
});
```

---

## 📱 Responsive Design

### Detección de Mobile

```javascript
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 1024); // Breakpoint lg de Tailwind
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

### Comportamiento Mobile vs Desktop

| Característica | Mobile (< 1024px) | Desktop (≥ 1024px) |
|----------------|-------------------|---------------------|
| Sidebar | Colapsable | Siempre visible |
| Navegación | Hamburger menu | Tabs horizontales |
| Chat | Pantalla completa | Split view |

---

## 🔧 Componentes Relacionados

### Frontend

**Página Principal:**
- `GroupDetail.jsx` - Página de detalle con navegación entre secciones

**Secciones:**
- `GroupFeed.jsx` - Feed de publicaciones
- `GroupChat.jsx` - Chat del grupo
- `GroupInfo.jsx` - Información del grupo
- `GroupMembers.jsx` - Lista de miembros y solicitudes
- `GroupMultimedia.jsx` - Galería de fotos/videos
- `GroupFiles.jsx` - Documentos compartidos
- `GroupLinks.jsx` - Enlaces compartidos
- `GroupEvents.jsx` - Eventos destacados
- `GroupSettings.jsx` - Configuración del grupo

**Hooks:**
- `useGroupData.js` - Hook para obtener datos del grupo

**Services:**
- `groupService.js` - API calls para grupos

---

## 🐛 Troubleshooting

### Error 1: Contador de Mensajes No Se Actualiza

**Síntoma:** El badge de mensajes no leídos no cambia

**Causas Posibles:**
- Socket.IO no está conectado
- No se está escuchando el evento `newGroupMessage`
- LocalStorage no guarda el timestamp

**Solución:**
```javascript
// Verificar en consola
console.log('Socket conectado:', socket.connected);
console.log('Último timestamp:', localStorage.getItem(`group_chat_last_visit_${id}`));

// Verificar que el evento se escuche
socket.on('newGroupMessage', (msg) => {
  console.log('📨 Nuevo mensaje recibido:', msg);
});
```

---

### Error 2: Contador de Solicitudes No Se Actualiza

**Síntoma:** El badge de solicitudes pendientes no refleja nuevas solicitudes

**Causas Posibles:**
- No se ejecuta `refetch()` al recibir notificación
- `groupData.joinRequests` no está poblado

**Solución:**
```javascript
// Verificar que refetch se ejecute
socket.on('newNotification', (notification) => {
  if (notification.tipo === 'solicitud_grupo') {
    console.log('🔄 Recargando datos del grupo...');
    refetch();
  }
});

// Verificar estructura de datos
console.log('Solicitudes:', groupData?.joinRequests);
console.log('Contador:', pendingRequestsCount);
```

---

### Error 3: No Navega a Sección Correcta desde Notificación

**Síntoma:** Click en notificación lleva al grupo pero no abre la pestaña correcta

**Causa:** La página no lee `location.state.openMembersTab`

**Solución:**
```javascript
// En GroupDetail.jsx
const location = useLocation();

useEffect(() => {
  if (location.state?.openMembersTab) {
    setActiveSection('members');
  }
}, [location.state]);
```

---

### Error 4: Mensajes Duplicados en Chat

**Síntoma:** Los mensajes aparecen dos veces

**Causa:** Socket.IO emite el mensaje y luego se recarga la lista

**Solución:**
```javascript
// En GroupChat.jsx - agregar mensaje optimísticamente
const handleSendMessage = async (content) => {
  const tempMessage = {
    _id: `temp-${Date.now()}`,
    content,
    author: user,
    createdAt: new Date()
  };
  
  // Agregar inmediatamente a la UI
  setMessages(prev => [...prev, tempMessage]);
  
  try {
    const newMessage = await groupService.sendMessage(groupId, content);
    // Reemplazar mensaje temporal con el real
    setMessages(prev => prev.map(m => 
      m._id === tempMessage._id ? newMessage : m
    ));
  } catch (error) {
    // Remover mensaje temporal si falla
    setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
  }
};
```

---

## 📚 Backend - Endpoints

### Grupos

```javascript
GET    /api/grupos              // Obtener grupos del usuario
POST   /api/grupos              // Crear nuevo grupo
GET    /api/grupos/:id          // Obtener detalle del grupo
PUT    /api/grupos/:id          // Actualizar grupo
DELETE /api/grupos/:id          // Eliminar grupo
```

### Miembros

```javascript
POST   /api/grupos/:id/join                      // Solicitar unirse
POST   /api/grupos/:id/accept/:userId            // Aceptar solicitud
POST   /api/grupos/:id/reject/:userId            // Rechazar solicitud
POST   /api/grupos/:id/members/:memberId/role    // Cambiar rol (admin/member)
DELETE /api/grupos/:id/members/:memberId         // Expulsar miembro
```

### Mensajes

```javascript
GET    /api/grupos/:id/messages         // Obtener mensajes
POST   /api/grupos/:id/messages         // Enviar mensaje
DELETE /api/grupos/:id/messages/:msgId  // Eliminar mensaje
```

### Publicaciones

```javascript
GET    /api/publicaciones/grupo/:id     // Obtener posts del grupo
POST   /api/publicaciones/grupo/:id     // Crear post en grupo
```

---

## 🔗 Archivos Relacionados

### Backend
- `src/models/Group.js` - Modelo de grupo
- `src/controllers/groupController.js` - Lógica de grupos
- `src/routes/group.routes.js` - Rutas de grupos
- `src/services/socketService.js` - Eventos Socket.IO

### Frontend
- `src/features/grupos/pages/GroupDetail.jsx` - Página principal
- `src/features/grupos/hooks/useGroupData.js` - Hook de datos
- `src/features/grupos/services/groupService.js` - API calls
- `src/features/grupos/components/` - Componentes de secciones

---

## ✅ Checklist de Funcionalidades

- [x] Navegación entre secciones
- [x] Contador de mensajes no leídos
- [x] Contador de solicitudes pendientes
- [ ] Contador de nuevos posts (requiere implementación)
- [x] Roles y permisos
- [x] Socket.IO en tiempo real
- [x] Responsive design
- [x] LocalStorage para timestamps
- [x] Navegación desde notificaciones
- [x] Refetch automático de datos

---

## 📊 Sección "Detalle" - Datos Mostrados

### Información General (Datos Reales ✅)

| Campo | Fuente | Estado |
|-------|--------|--------|
| Nombre del Grupo | `groupData.nombre` | ✅ Real |
| Tipo de Grupo | `groupData.tipo` | ✅ Real |
| Descripción | `groupData.descripcion` | ✅ Real |
| Fecha de Creación | `groupData.createdAt` | ✅ Real |
| Propietario | `groupData.members` (rol 'owner') | ✅ Real |

### Estadísticas

| Métrica | Fuente | Estado | Solución |
|---------|--------|--------|----------|
| **Miembros Totales** | `groupData.members.length` | ✅ Real | - |
| **Administradores** | Cuenta de `role === 'admin'` o `'owner'` | ✅ Real | - |
| **Solicitudes Pendientes** | `groupData.joinRequests` filtrado por `status === 'pending'` | ✅ Real | - |
| **Mensajes** | `groupData.messageCount` | ⚠️ Placeholder | Ver solución abajo |
| **Archivos** | `groupData.fileCount` | ⚠️ Placeholder | Ver solución abajo |
| **Actividad** | `groupData.activityLevel` | ⚠️ Placeholder | Ver solución abajo |

---

## 🔧 Soluciones para Datos Placeholder

### Opción 1: Calcular en Tiempo Real (Frontend)

**Ventaja:** No requiere cambios en el modelo
**Desventaja:** Requiere llamadas API adicionales

```javascript
// En GroupInfo.jsx
const [messageCount, setMessageCount] = useState(0);
const [fileCount, setFileCount] = useState(0);

useEffect(() => {
  const loadStats = async () => {
    try {
      // Obtener mensajes
      const messages = await groupService.getMessages(groupData._id);
      setMessageCount(messages.length);
      
      // Obtener archivos (si tienes endpoint)
      const files = await groupService.getFiles(groupData._id);
      setFileCount(files.length);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  if (groupData?._id) {
    loadStats();
  }
}, [groupData?._id]);
```

---

### Opción 2: Agregar Campos al Modelo (Backend)

**Ventaja:** Más eficiente, datos siempre disponibles
**Desventaja:** Requiere mantener contadores actualizados

```javascript
// En Group.js - agregar a estadisticas
estadisticas: {
  totalPublicaciones: { type: Number, default: 0 },
  publicacionesEsteMes: { type: Number, default: 0 },
  totalMensajes: { type: Number, default: 0 },        // ✅ NUEVO
  totalArchivos: { type: Number, default: 0 },        // ✅ NUEVO
  nivelActividad: { type: Number, default: 0, min: 0, max: 100 }  // ✅ NUEVO
}
```

**Actualizar contadores:**
```javascript
// En groupController.js - al enviar mensaje
await Group.findByIdAndUpdate(groupId, {
  $inc: { 'estadisticas.totalMensajes': 1 }
});

// En groupController.js - al subir archivo
await Group.findByIdAndUpdate(groupId, {
  $inc: { 'estadisticas.totalArchivos': 1 }
});

// Calcular nivel de actividad (cron job o al consultar)
const calculateActivityLevel = (group) => {
  const daysSinceCreation = (Date.now() - group.createdAt) / (1000 * 60 * 60 * 24);
  const messagesPerDay = group.estadisticas.totalMensajes / daysSinceCreation;
  const postsPerDay = group.estadisticas.totalPublicaciones / daysSinceCreation;
  
  // Fórmula simple: más mensajes y posts = mayor actividad
  const activityScore = Math.min(100, (messagesPerDay * 10) + (postsPerDay * 20));
  return Math.round(activityScore);
};
```

---

### Opción 3: Usar Virtuals (Backend)

**Ventaja:** Se calcula automáticamente al consultar
**Desventaja:** Puede ser lento con muchos datos

```javascript
// En Group.js - agregar virtuals
groupSchema.virtual('messageCount').get(async function() {
  const GroupMessage = mongoose.model('GroupMessage');
  return await GroupMessage.countDocuments({ grupo: this._id });
});

groupSchema.virtual('fileCount').get(async function() {
  const GroupMessage = mongoose.model('GroupMessage');
  return await GroupMessage.countDocuments({ 
    grupo: this._id,
    'attachments.0': { $exists: true }
  });
});
```

---

## 🎯 Recomendación

**Para Mensajes y Archivos:**
- Usar **Opción 2** (campos en modelo con contadores)
- Actualizar contadores con `$inc` al crear/eliminar

**Para Nivel de Actividad:**
- Usar **Opción 2** con cálculo periódico (cron job diario)
- O calcular en tiempo real al consultar el grupo

**Implementación Sugerida:**
```javascript
// Backend - groupController.js
const getGroupById = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('creador', 'nombres apellidos social.fotoPerfil')
    .populate('administradores', 'nombres apellidos social.fotoPerfil')
    .populate('miembros.usuario', 'nombres apellidos social.fotoPerfil');
  
  // Calcular nivel de actividad en tiempo real
  if (group) {
    group.estadisticas.nivelActividad = calculateActivityLevel(group);
  }
  
  res.json(group);
};
```

---

## 🎯 Mejoras Futuras

1. **Contador de Nuevos Posts:**
   - Implementar evento Socket.IO `newGroupPost`
   - Guardar timestamp de última visita al feed
   - Resetear contador al entrar al feed

2. **Notificaciones Push:**
   - Notificar cuando hay mensajes no leídos
   - Badge en el ícono de la app

3. **Búsqueda en Chat:**
   - Buscar mensajes por contenido
   - Filtrar por fecha o autor

4. **Multimedia Mejorado:**
   - Subir múltiples archivos
   - Preview de imágenes
   - Galería lightbox

---

## 📝 Notas Importantes

> [!IMPORTANT]
> **LocalStorage Keys:**
> - `group_chat_last_visit_{groupId}` - Timestamp de última visita al chat
> 
> **Socket.IO Events:**
> - `newGroupMessage` - Nuevo mensaje en el grupo
> - `newNotification` - Nueva notificación (incluye solicitudes)
> 
> **State Management:**
> - Los contadores se manejan con `useState` local
> - Los datos del grupo se obtienen con `useGroupData` hook
> - El refetch se ejecuta automáticamente en notificaciones
