# 📘 Funcionamiento Global - DegaderSocial V2

> **Análisis Exhaustivo Completo**  
> Fecha: 2026-02-02  
> Backend: v1.6.2 | Frontend: v1.12.3

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Inventario de Archivos](#inventario-de-archivos)
4. [Backend - Análisis Detallado](#backend-análisis-detallado)
5. [Frontend - Análisis Detallado](#frontend-análisis-detallado)
6. [Comunicación y Flujos de Datos](#comunicación-y-flujos-de-datos)
7. [Auditoría Técnica](#auditoría-técnica)
8. [Recomendaciones de Refactorización](#recomendaciones-de-refactorización)

---

## 🎯 Resumen Ejecutivo

### ¿Qué es DegaderSocial?

**DegaderSocial V2** es una plataforma social integral diseñada específicamente para la **Fundación Humanitaria Sol y Luna (FHS&L)** y sus comunidades eclesiásticas. Combina funcionalidades de red social tradicional con herramientas especializadas para gestión organizacional, ministerial y comunitaria.

### Funcionalidades Principales

#### 🌐 Red Social
- Sistema de amistades y seguimiento
- Publicaciones con imágenes/videos múltiples
- Comentarios anidados y reacciones
- Mensajería privada en tiempo real
- Grupos temáticos con roles

#### ⛪ Gestión Eclesiástica
- Administración de iglesias y membresía
- Sistema de ministerios con roles jerárquicos
- Eventos y reuniones virtuales
- Chat interno por iglesia
- Historial de miembros

#### 🏛️ Gestión Fundación
- Estructura organizacional multinivel (Internacional → Municipal)
- Sistema de aprobación jerárquica
- Gestión territorial por país/región/departamento
- Roles y áreas especializadas

#### 💼 Características Avanzadas
- Sistema de publicidad segmentada
- Moderación y reportes
- Tickets de soporte
- Auditoría de acciones (logs)
- Panel de administración multinivel

---

## 🏗️ Arquitectura General

### Stack Tecnológico

#### Backend
```
- Runtime: Node.js (Express 5.1.0)
- Base de Datos: MongoDB (Mongoose 8.19.2)
- Autenticación: JWT + Argon2
- Comunicación Real-Time: Socket.IO 4.8.1
- Almacenamiento: AWS S3 (Cloudflare R2)
- Seguridad: Helmet, Rate Limiting
- Logging: Winston
```

#### Frontend
```
- Framework: React 19.1.1
- Build Tool: Vite 7.1.7
- Routing: React Router DOM 7.9.4
- Estilos: TailwindCSS 4.1.16 + Bootstrap 5.3.8
- Comunicación: Axios + Socket.IO Client
- Animaciones: Framer Motion
- Testing: Vitest + Testing Library
```

### Patrón Arquitectónico

**Backend**: MVC (Model-View-Controller) con servicios
```
┌─────────────┐
│   Routes    │ ← Define endpoints
└──────┬──────┘
       │
┌──────▼──────┐
│ Controllers │ ← Lógica de negocio
└──────┬──────┘
       │
┌──────▼──────┐
│   Models    │ ← Esquemas Mongoose
└──────┬──────┘
       │
┌──────▼──────┐
│  Services   │ ← Lógica reutilizable
└─────────────┘
```

**Frontend**: Feature-Based Architecture
```
src/
├── features/        ← Módulos por funcionalidad
│   ├── auth/
│   ├── feed/
│   ├── iglesias/
│   └── ...
├── shared/          ← Componentes reutilizables
├── context/         ← Estado global
└── api/             ← Servicios HTTP
```

---

## 📊 Inventario de Archivos

### Backend: **100 archivos**

| Categoría | Cantidad | Archivos |
|-----------|----------|----------|
| **Modelos** | 20 | User.model.js, Iglesia.js, Group.js, Post.js, Notification.js, Conversation.js, Meeting.js, Ad.js, Report.js, Ticket.js, Folder.js, Friendship.js, ChurchEvent.js, IglesiaMessage.js, GroupMessage.js, IglesiaTestimonial.js, AdCredit.js, AdImpression.js, CreditTransaction.js, AuditLog.js |
| **Controladores** | 26 | authController, userController, postController, groupController, iglesiaController, fundacionController, ministerioController, notificationController, conversationController, friendshipController, meetingController, adController, reportController, ticketController, adminController, founderController, etc. |
| **Rutas** | 20 | auth, user, post, group, iglesia, fundacion, ministerio, notification, conversation, friendship, meeting, ad, report, ticket, admin, founder, search, folder, favoritos |
| **Middlewares** | 5 | auth.middleware, checkModerator, isFounder, ministerioMiddleware, upload.middleware |
| **Servicios** | 3 | socketService, r2Service, jerarquiaResolver |
| **Config** | 2 | logger, r2 |

### Frontend: **392 archivos**

| Categoría | Cantidad | Features Principales |
|-----------|----------|---------------------|
| **Features** | 21 | admin, ads, amigos, amistades, auth, buscador, carpetas, favoritos, feed, founder, fundacion, grupos, iglesias, mail, mensajes, moderacion, notificaciones, perfilUsuario, perfilVisitante, reuniones, tickets |
| **Componentes** | ~150 | Distribuidos por feature |
| **Hooks** | ~40 | Custom hooks por feature |
| **Servicios API** | 20 | Uno por cada módulo backend |
| **Contextos** | 3 | AuthContext, OnlineUsersContext, ToastProvider |

---

## 🔧 Backend - Análisis Detallado

### 📦 Modelos de Datos (20 archivos)

#### 1. **User.model.js** (487 líneas)
**Propósito**: Modelo principal de usuarios con arquitectura modular

**Estructura**:
- **Identidad Core**: nombres, apellidos, email, username, password
- **Discriminadores**: `esMiembroFundacion`, `esMiembroIglesia`
- **Módulos**:
  - `personal`: InfoPersonalSchema (datos personales, ubicación)
  - `fundacion`: PerfilFundacionSchema (nivel, área, cargo, territorio, aprobación)
  - `eclesiastico`: PerfilEclesiasticoSchema (iglesia, rol, ministerios)
  - `social`: PerfilSocialSchema (username, fotos, biografía, stats, privacidad)
  - `seguridad`: SeguridadSchema (rol sistema, estado cuenta, permisos, auditoría)
  - `perfilPublicitario`: PerfilPublicitarioSchema (intereses, ubicación, consentimientos)

**Constantes Importantes**:
```javascript
ROLES_SISTEMA: ["Founder", "admin", "moderador", "usuario", "soporte"]
NIVELES_FUNDACION: ["directivo_general", "organo_control", "organismo_internacional", 
                    "nacional", "regional", "departamental", "municipal"]
ROLES_MINISTERIALES: ["pastor_principal", "pastor_asociado", "anciano", "diacono",
                      "lider", "director", "maestro", "coordinador", "miembro", "servidor", "adminIglesia"]
MINISTERIOS: ["musica", "caballeros", "damas", "escuela_dominical", "evangelismo",
              "limpieza", "cocina", "medios", "juventud", "intercesion",
              "consejeria", "visitacion", "seguridad", "protocolo"]
```

**Métodos**:
- `comparePassword()`: Verifica contraseña con Argon2
- `toJSON()`: Limpia respuesta (elimina password)
- Pre-save hook: Hashea password automáticamente

**Índices**:
- Búsqueda por nombre completo
- Búsqueda organizacional (fundación + territorio + nivel + área)
- Búsqueda eclesiástica (iglesia + rol)

**⚠️ Problemas Detectados**:
- Modelo muy grande (487 líneas) - dificulta mantenimiento
- Arrays embebidos (`amigos`, `solicitudesAmistad`) no escalan bien
- Falta validación de coherencia entre discriminadores y perfiles

#### 2. **Iglesia.js** (140 líneas)
**Propósito**: Gestión de iglesias/congregaciones

**Campos Clave**:
- `pastorPrincipal`: Referencia a UserV2 (requerido)
- `miembros[]`: Array de referencias a UserV2
- `solicitudes[]`: Solicitudes de ingreso pendientes
- `historialSalidas[]`: Registro detallado de ex-miembros con roles y tiempo
- `multimedia[]`: Galería de imágenes/videos
- `reuniones[]` y `horarios[]`: Programación de actividades

**Alias**: Registra alias 'Ministerio' para compatibilidad con notificaciones

**⚠️ Problemas**:
- Duplicación de campos `reuniones` y `horarios` (confuso)
- Array `miembros` no escala para iglesias grandes
- Falta validación de roles del pastor

#### 3. **Group.js** (100 líneas)
**Propósito**: Grupos temáticos de usuarios

**Roles**: creador, administradores[], moderadores[], miembros[]
**Tipos**: publico, privado, secreto
**Estadísticas**: totalPublicaciones, publicacionesEsteMes, nivelActividad

**⚠️ Problemas**:
- Estructura de miembros anidada (usuario + fechaUnion + rol) dificulta queries
- Estadísticas no se actualizan automáticamente

#### 4. **Post.js** (120 líneas)
**Propósito**: Publicaciones de usuarios

**Características**:
- Soporte multi-imagen y multi-video
- Comentarios anidados (2 niveles)
- Sistema de compartidos
- Privacidad: publico, amigos, privado
- Asociación a grupos

**⚠️ Problemas**:
- Campo `imagen` deprecated pero no eliminado
- Comentarios embebidos no escalan (mejor colección separada)

#### 5. **Notification.js** (94 líneas)
**Propósito**: Sistema de notificaciones

**Tipos** (20 tipos):
- Amistades: solicitud_amistad, amistad_aceptada, amistad_eliminada
- Posts: like_post, comentario_post, compartir_post
- Grupos: invitacion_grupo, solicitud_grupo_aprobada
- Iglesias: solicitud_iglesia, ministerio_asignado
- Fundación: solicitud_fundacion_aprobada
- Sistema: nuevo_anuncio, alerta_seguridad

**Referencia Dinámica**: Usa `refPath` para referenciar diferentes modelos

**⚠️ Problemas**:
- No hay TTL (Time To Live) - notificaciones antiguas se acumulan
- Falta paginación en queries

#### 6. **Conversation.js** (180 líneas)
**Propósito**: Mensajería privada

**Características**:
- Mensajes embebidos con tipos (texto, imagen, archivo, video, audio)
- Sistema de solicitudes de mensaje (message requests)
- Estados: archivado, destacado, eliminado, vaciado (por usuario)
- Contador de mensajes no leídos por participante

**Métodos**:
- `agregarMensaje()`: Añade mensaje y actualiza contadores
- `marcarComoLeido()`: Resetea contador para usuario

**⚠️ Problemas**:
- Mensajes embebidos no escalan (mejor colección separada)
- Lógica compleja de estados por usuario

#### 7. **Meeting.js** (76 líneas)
**Propósito**: Reuniones virtuales

**Asociaciones**: group, iglesia
**Campos**: title, description, date, time, meetLink, timezone, startsAt
**Tipos**: oracion, estudio_biblico, culto, escuela_dominical, capacitacion, grupal, comercial
**Estados**: upcoming, in-progress, completed, cancelled

**⚠️ Problemas**:
- Campos redundantes: `date` + `time` vs `startsAt`
- Falta validación de timezone

### 🎮 Controladores (26 archivos)

Los controladores más grandes y complejos:

#### 1. **groupController.js** (62,668 bytes - 26 archivos)
**Funciones**: 40+ endpoints para gestión completa de grupos
- CRUD de grupos
- Gestión de miembros (invitar, aceptar, expulsar, promover)
- Publicaciones de grupo
- Mensajes de chat
- Estadísticas

**⚠️ Problema**: Archivo demasiado grande, debería dividirse

#### 2. **iglesiaController.js** (40,104 bytes)
**Funciones**: Gestión completa de iglesias
- CRUD de iglesias
- Gestión de miembros y solicitudes
- Multimedia y testimonios
- Eventos
- Historial de salidas

#### 3. **postController.js** (44,541 bytes)
**Funciones**: Gestión de publicaciones
- CRUD de posts
- Likes y comentarios
- Compartir posts
- Feed personalizado
- Posts de grupos

#### 4. **fundacionController.js** (28,788 bytes)
**Funciones**: Gestión de la fundación
- Solicitudes de ingreso
- Aprobación jerárquica
- Búsqueda por territorio/nivel
- Gestión de perfiles

#### 5. **ministerioController.js** (35,394 bytes)
**Funciones**: Gestión de ministerios eclesiásticos
- Asignar/remover ministerios
- Gestión de roles ministeriales
- Búsqueda por ministerio

**⚠️ Problemas Generales en Controladores**:
- Archivos muy grandes (>30KB)
- Lógica de negocio mezclada con validaciones
- Falta separación en servicios reutilizables
- Código duplicado entre controladores
- Manejo de errores inconsistente

### 🛣️ Rutas (20 archivos)

Todas las rutas siguen el patrón `/api/{recurso}` y usan middlewares de autenticación.

**Principales**:
- `/api/auth` - Login, registro, perfil
- `/api/usuarios` - Gestión de usuarios
- `/api/publicaciones` - Posts
- `/api/amistades` - Sistema de amistades
- `/api/grupos` - Grupos
- `/api/iglesias` - Iglesias
- `/api/ministerios` - Ministerios
- `/api/fundacion` - Fundación
- `/api/notificaciones` - Notificaciones
- `/api/conversaciones` - Mensajes
- `/api/reuniones` - Meetings
- `/api/ads` - Publicidad
- `/api/reports` - Reportes
- `/api/tickets` - Soporte
- `/api/admin` - Panel admin
- `/api/founder` - Panel founder

### 🔐 Middlewares (5 archivos)

#### 1. **auth.middleware.js**
Verifica JWT y adjunta `req.user`

#### 2. **checkModerator.middleware.js**
Verifica rol moderador/admin/Founder

#### 3. **isFounder.middleware.js**
Verifica rol Founder exclusivamente

#### 4. **ministerioMiddleware.js**
Verifica permisos ministeriales

#### 5. **upload.middleware.js**
Maneja uploads con Multer

### 🔌 Servicios (3 archivos)

#### 1. **socketService.js** (392 líneas)
**Propósito**: Gestión completa de Socket.IO

**Funcionalidades**:
- Autenticación de sockets con JWT
- Gestión de salas (rooms): `user:{id}`, `conversation:{id}`, `group:{id}`, `meetings:{id}`
- Emisión de eventos:
  - `newNotification` - Notificaciones en tiempo real
  - `newMessage` - Mensajes privados
  - `newGroupMessage` - Mensajes de grupo
  - `meetingUpdate` - Actualizaciones de reuniones
  - `post_updated` - Nuevos posts
  - `friend_status_changed` - Estado online/offline de amigos
- Tracking de usuarios conectados (`connectedUsers` Map)
- Actualización de `ultimaConexion` en BD

**Eventos Escuchados**:
- `authenticate` - Autenticación inicial
- `subscribeNotifications`, `subscribeConversation`, `subscribeGroup`, `subscribeMeetings`
- `joinRoom`, `leaveRoom` - Gestión genérica de salas
- `disconnect` - Limpieza al desconectar

**⚠️ Problemas**:
- Funciones globales (`global.io`, `global.emitNotification`) - anti-patrón
- Falta manejo de reconexión
- No hay rate limiting para eventos

#### 2. **r2Service.js**
Gestión de uploads a Cloudflare R2 (S3-compatible)

#### 3. **jerarquiaResolver.js**
Resuelve jerarquías de la fundación para aprobaciones

### ⚙️ Configuración

#### **index.js** (232 líneas)
**Punto de entrada del backend**

**Configuración**:
- Express con middlewares de seguridad (Helmet, CORS, Rate Limiting)
- Socket.IO con CORS configurado
- MongoDB connection
- Logging con Morgan + Winston
- Servir archivos estáticos (`/uploads`)
- Manejo de errores global
- Graceful shutdown

**CORS Origins**:
```javascript
['http://localhost:5173', 'http://localhost:5174', 
 'http://localhost:3000', 'http://3.144.132.207']
```

**Rate Limiting**: 1000 requests / 15 minutos (modo desarrollo)

---

## 🎨 Frontend - Análisis Detallado

### 📂 Estructura de Features (21 módulos)

Cada feature sigue la estructura:
```
features/{nombre}/
├── components/     ← Componentes específicos
├── hooks/          ← Custom hooks
├── pages/          ← Páginas/vistas
└── utils/          ← Utilidades
```

### 🔑 Features Principales

#### 1. **auth** - Autenticación
- `Login.jsx`, `Register.jsx`
- `ProtectedRoute.jsx` - HOC para rutas protegidas
- Validación de formularios

#### 2. **feed** - Feed de publicaciones
- `FeedPage.jsx` - Vista principal
- `PostCard.jsx` - Tarjeta de publicación
- `CreatePost.jsx` - Crear publicación
- `CommentSection.jsx` - Comentarios anidados

#### 3. **iglesias** - Gestión de iglesias
**Páginas**:
- `IglesiaPage.jsx` - Listado de iglesias
- `IglesiaDetail.jsx` - Detalle de iglesia (con sidebar interno)
- `MemberProfilePage.jsx` - Perfil de miembro
- `IglesiaExMiembros.jsx` - Historial de salidas

**Componentes**:
- `IglesiaSidebar.jsx` - Navegación interna
- `IglesiaMembers.jsx` - Listado de miembros
- `IglesiaEvents.jsx` - Eventos
- `IglesiaMultimedia.jsx` - Galería
- `IglesiaChat.jsx` - Chat interno

**⚠️ Problemas**:
- Sidebar con z-index issues (reportado en historial)
- Contador de eventos incluye eventos pasados (bug conocido)

#### 4. **grupos** - Gestión de grupos
Similar a iglesias pero para grupos temáticos

#### 5. **fundacion** - Gestión de fundación
- Solicitudes de ingreso
- Aprobación jerárquica
- Búsqueda por territorio

#### 6. **ministerios** - Gestión ministerial
- Asignación de ministerios
- Gestión de roles

#### 7. **mensajes** - Mensajería
- `MensajesPage.jsx` - Inbox con lista de conversaciones
- `ConversationView.jsx` - Vista de conversación
- Message requests para no-amigos

#### 8. **notificaciones** - Notificaciones
- `NotificationsPage.jsx` - Centro de notificaciones
- `NotificationCard.jsx` - Tarjeta por tipo
- Redirección según tipo de notificación

**⚠️ Problema conocido**: Notificaciones de fundación no redirigen correctamente (reportado)

#### 9. **ads** - Sistema de publicidad
- `ClientAdsDashboard.jsx` - Panel cliente
- `FounderAdsDashboard.jsx` - Panel admin
- `CreateCampaignModal.jsx` - Crear campaña
- `CampaignAnalyticsPage.jsx` - Analíticas

#### 10. **admin** - Panel de administración
- `SuspendedUsersPage.jsx` - Usuarios suspendidos
- `TicketsManagementPage.jsx` - Gestión de tickets
- `AuditLogsPage.jsx` - Logs de auditoría (solo Founder)

### 🎣 Hooks Personalizados

Ejemplos de hooks importantes:
- `useAuth()` - Contexto de autenticación
- `useSocket()` - Conexión Socket.IO
- `useOnlineUsers()` - Estado de usuarios online
- `useNotifications()` - Gestión de notificaciones
- `useFundacion()` - Gestión de fundación
- `useIglesia()` - Gestión de iglesias

### 🌐 Servicios API (20 archivos)

Todos los servicios usan Axios con interceptores para:
- Agregar token JWT automáticamente
- Manejo centralizado de errores
- Refresh token (si implementado)

**Ejemplo**: `authService.js`
```javascript
login(email, password)
register(userData)
getProfile()
updateProfile(data)
logout()
```

### 🔄 Contextos Globales

#### 1. **AuthContext.jsx** (186 líneas)
**Estado Global**:
- `user` - Usuario autenticado
- `loading` - Estado de carga
- `isAuthenticated` - Boolean

**Funciones**:
- `login()`, `register()`, `logout()`
- `updateUser()`, `refreshProfile()`

**Listeners**:
- `socket:user:status_changed` - Recarga perfil si usuario suspendido/activado
- `socket:notification:new` - Recarga perfil si ministerio asignado

#### 2. **OnlineUsersContext.jsx**
Gestiona estado online/offline de amigos usando Socket.IO

#### 3. **ToastProvider.jsx**
Sistema de notificaciones toast

### 🎨 Estilos

**Sistema Dual**:
- TailwindCSS 4.1.16 (utility-first)
- Bootstrap 5.3.8 (componentes legacy)

**⚠️ Problema**: Conflicto entre ambos frameworks, genera inconsistencias visuales

---

## 🔗 Comunicación y Flujos de Datos

### 🌊 Flujo de Autenticación

```
1. Usuario → Login Form
2. Frontend → POST /api/auth/login {email, password}
3. Backend → Verifica credenciales (Argon2)
4. Backend → Genera JWT
5. Backend → Retorna {token, user}
6. Frontend → Guarda token en localStorage
7. Frontend → Inicializa Socket.IO con token
8. Socket.IO → Autenticación (evento 'authenticate')
9. Backend → Verifica JWT, une a sala user:{id}
10. Frontend → Actualiza AuthContext
```

### 📡 Flujo de Notificaciones en Tiempo Real

```
1. Acción (ej: like en post)
2. Backend Controller → Crea Notification en BD
3. Backend Controller → Llama global.emitNotification(userId, notification)
4. SocketService → io.to(`user:${userId}`).emit('newNotification', notification)
5. Frontend Socket Listener → Recibe evento
6. Frontend → Dispara evento custom 'socket:notification:new'
7. NotificationsPage → Actualiza lista de notificaciones
```

### 💬 Flujo de Mensajería

```
1. Usuario escribe mensaje
2. Frontend → POST /api/conversaciones/:id/mensajes {contenido}
3. Backend → Guarda mensaje en Conversation.mensajes[]
4. Backend → Actualiza ultimoMensaje y mensajesNoLeidos
5. Backend → global.emitMessage(conversationId, message)
6. SocketService → io.to(`conversation:${conversationId}`).emit('newMessage', message)
7. Frontend (ambos participantes) → Recibe mensaje
8. Frontend → Actualiza UI instantáneamente
```

### 🔄 Flujo de Estado Online/Offline

```
1. Usuario se conecta
2. Socket.IO → Evento 'authenticate'
3. SocketService → Actualiza connectedUsers Map
4. SocketService → Actualiza seguridad.ultimaConexion en BD
5. SocketService → Busca amigos en Friendship collection
6. SocketService → Emite 'friend_status_changed' a cada amigo
7. Frontend (amigos) → Actualiza OnlineUsersContext
8. Frontend → Muestra indicador verde
```

---

## 🔍 Auditoría Técnica

### ❌ Errores Críticos

#### 1. **Código Duplicado**
- **Ubicación**: Controladores (groupController, iglesiaController, postController)
- **Problema**: Lógica de validación, paginación y manejo de errores repetida
- **Impacto**: Mantenimiento difícil, bugs inconsistentes
- **Solución**: Crear servicios reutilizables y middlewares de validación

#### 2. **Archivos Temporales No Eliminados**
- `conversationController_temp1.js` (10,954 bytes)
- `conversationController_temp2.js` (12,545 bytes)
- `groupController_BACKUP.js` (95 bytes)
- `postController.js_snippet_temp` (2,981 bytes)
- `iglesiaController.updateIglesia.js` (1,480 bytes)
- **Impacto**: Confusión, riesgo de usar código obsoleto
- **Solución**: Eliminar inmediatamente

#### 3. **Modelos con Arrays No Escalables**
- `User.amigos[]` - No escala para usuarios con miles de amigos
- `Iglesia.miembros[]` - No escala para iglesias grandes
- `Post.comentarios[]` - No escala para posts virales
- `Conversation.mensajes[]` - No escala para conversaciones largas
- **Impacto**: Performance degradada, queries lentas
- **Solución**: Migrar a colecciones separadas con referencias

#### 4. **Funciones Globales (Anti-patrón)**
```javascript
// socketService.js
global.io = io;
global.emitNotification = this.emitNotification.bind(this);
```
- **Problema**: Dificulta testing, crea dependencias ocultas
- **Solución**: Inyección de dependencias o patrón singleton

#### 5. **Falta de Validación de Entrada**
- Muchos controladores no validan datos antes de guardar
- Riesgo de inyección NoSQL
- **Solución**: Usar express-validator en todas las rutas

### ⚠️ Errores de Diseño y Layout

#### 1. **Conflicto TailwindCSS + Bootstrap**
- **Problema**: Ambos frameworks cargados simultáneamente
- **Impacto**: Clases conflictivas, tamaño de bundle inflado
- **Ejemplo**: Botones con estilos mezclados
- **Solución**: Migrar completamente a TailwindCSS

#### 2. **Inconsistencias Visuales**
- Algunos componentes usan tema claro en modo oscuro
- Colores hardcodeados en lugar de variables CSS
- **Ubicación**: Varios componentes de iglesias y grupos
- **Solución**: Sistema de diseño unificado con variables CSS

#### 3. **Z-index Issues**
- Sidebar de iglesias aparece detrás del contenido
- Notificaciones detrás del chat
- **Solución**: Sistema de z-index estandarizado

#### 4. **Responsive Design Incompleto**
- Algunas páginas no funcionan bien en móvil
- Sidebar no se oculta automáticamente
- **Solución**: Revisar breakpoints y usar mobile-first

### 🐛 Bugs Conocidos (del Historial)

1. **Contador de eventos incluye eventos pasados** (Iglesias)
2. **Notificaciones de fundación no redirigen** (Fundación)
3. **Historial de salidas desalineado** (Iglesias)
4. **Notificaciones de chat detrás de la interfaz** (Z-index)
5. **Sidebar de grupos no overlay correcto** (Layout)

### 🔒 Problemas de Seguridad

#### 1. **Rate Limiting Muy Permisivo**
```javascript
max: 1000, // 1000 requests / 15 minutos
```
- **Riesgo**: Ataques de fuerza bruta
- **Solución**: Reducir a 100 requests/15min en producción

#### 2. **CORS Muy Abierto**
```javascript
origin: ['http://localhost:5173', 'http://3.144.132.207']
```
- **Riesgo**: IP pública sin HTTPS
- **Solución**: Usar dominio con HTTPS

#### 3. **Logs Excesivos en Producción**
- Logs de debug en consola exponen información sensible
- **Solución**: Usar niveles de log según NODE_ENV

#### 4. **Falta Sanitización de HTML**
- Contenido de posts no sanitizado
- **Riesgo**: XSS
- **Solución**: Usar DOMPurify (ya instalado pero no usado consistentemente)

### 🗂️ Problemas de Arquitectura

#### 1. **Controladores Monolíticos**
- `groupController.js`: 62KB
- `iglesiaController.js`: 40KB
- `postController.js`: 44KB
- **Solución**: Dividir en módulos más pequeños

#### 2. **Falta de Capa de Servicios**
- Lógica de negocio mezclada en controladores
- **Solución**: Crear capa de servicios (ej: `userService.js`, `postService.js`)

#### 3. **Modelos Sobrecargados**
- `User.model.js`: 487 líneas
- **Solución**: Dividir en sub-modelos o usar herencia

#### 4. **Falta de Tests**
- Carpeta `tests/` vacía en backend
- Carpeta `test/` con archivos mínimos en frontend
- **Solución**: Implementar tests unitarios e integración

### 📦 Problemas de Performance

#### 1. **Queries N+1**
- Muchos controladores no usan `.populate()` eficientemente
- **Ejemplo**: Cargar posts sin popular usuario
- **Solución**: Usar `.populate()` con `select` específico

#### 2. **Falta de Paginación**
- Algunos endpoints retornan todos los resultados
- **Ejemplo**: `/api/notificaciones` sin límite
- **Solución**: Implementar paginación cursor-based

#### 3. **Imágenes Sin Optimizar**
- Imágenes subidas sin compresión
- **Solución**: Implementar Sharp para redimensionar

#### 4. **Bundle Size Grande**
- Frontend: TailwindCSS + Bootstrap + múltiples librerías
- **Solución**: Tree-shaking, lazy loading de rutas

### 🔄 Código Obsoleto

#### 1. **Campos Deprecated**
```javascript
// Post.js
imagen: { type: String, default: null } // DEPRECATED
```
- **Solución**: Migrar datos y eliminar campo

#### 2. **Rutas Duplicadas**
```javascript
// routes.jsx
{ path: '/favoritos', element: <FavoritosPage /> }, // Duplicado
{ path: '/favoritos', element: <FavoritosPage /> },
```

#### 3. **Imports Comentados**
```javascript
// main.jsx
// import './index.css'
// import App from './App.jsx'
```
- **Solución**: Eliminar o descomentar

### 🚨 Posibles Conflictos

#### 1. **Alias de Modelos**
```javascript
// User.model.js
model('User', UserV2Schema, UserV2.collection.name);
// Iglesia.js
model('Ministerio', IglesiaSchema, Iglesia.collection.name);
```
- **Riesgo**: Confusión en referencias
- **Solución**: Documentar claramente o eliminar aliases

#### 2. **Estado Compartido en Socket.IO**
- `connectedUsers` Map en memoria
- **Riesgo**: Se pierde al reiniciar servidor
- **Solución**: Usar Redis para estado compartido

#### 3. **Timezone Handling**
- Meetings usan `timezone` pero no se valida
- **Riesgo**: Errores de conversión
- **Solución**: Usar librería como `date-fns-tz`

---

## 🚀 Recomendaciones de Refactorización

### 🔥 Prioridad Alta (Crítico)

#### 1. **Eliminar Archivos Temporales**
```bash
rm conversationController_temp1.js
rm conversationController_temp2.js
rm groupController_BACKUP.js
rm postController.js_snippet_temp
rm iglesiaController.updateIglesia.js
```

#### 2. **Migrar Arrays a Colecciones**
**Crear nuevos modelos**:
- `UserFriendship.js` (reemplaza `User.amigos[]`)
- `IglesiaMembership.js` (reemplaza `Iglesia.miembros[]`)
- `Comment.js` (reemplaza `Post.comentarios[]`)
- `Message.js` (reemplaza `Conversation.mensajes[]`)

**Beneficios**: Escalabilidad, queries eficientes, índices específicos

#### 3. **Implementar Capa de Servicios**
```
src/services/
├── userService.js
├── postService.js
├── groupService.js
├── iglesiaService.js
└── notificationService.js
```

**Ejemplo**:
```javascript
// services/postService.js
class PostService {
  async createPost(userId, data) { /* ... */ }
  async getFeed(userId, page) { /* ... */ }
  async likePost(postId, userId) { /* ... */ }
}
```

#### 4. **Unificar Framework CSS**
- **Opción A**: Migrar completamente a TailwindCSS
- **Opción B**: Mantener solo Bootstrap
- **Recomendado**: TailwindCSS (más moderno, mejor tree-shaking)

### ⚡ Prioridad Media

#### 5. **Dividir Controladores Grandes**
```
controllers/
├── group/
│   ├── groupCRUD.js
│   ├── groupMembers.js
│   ├── groupPosts.js
│   └── groupMessages.js
```

#### 6. **Implementar Validación Centralizada**
```javascript
// validators/postValidator.js
const createPostSchema = {
  contenido: { type: 'string', min: 1, max: 5000 },
  privacidad: { type: 'enum', values: ['publico', 'amigos', 'privado'] }
};
```

#### 7. **Sistema de Diseño Unificado**
```css
/* design-system.css */
:root {
  --color-primary: #...;
  --color-secondary: #...;
  --z-modal: 1000;
  --z-sidebar: 900;
  --z-notification: 800;
}
```

#### 8. **Optimización de Imágenes**
```javascript
// middleware/imageOptimizer.js
const sharp = require('sharp');
// Redimensionar a 1200px max, comprimir a 80% quality
```

### 🔧 Prioridad Baja (Mejoras)

#### 9. **Implementar Tests**
```javascript
// tests/unit/userService.test.js
describe('UserService', () => {
  it('should create user with hashed password', async () => {
    // ...
  });
});
```

#### 10. **Documentación API con Swagger**
```javascript
/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Obtener feed de publicaciones
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 */
```

#### 11. **Lazy Loading de Rutas**
```javascript
const IglesiaPage = lazy(() => import('./features/iglesias/pages/IglesiaPage'));
```

#### 12. **Implementar Cache**
```javascript
// Redis para:
// - Sesiones de usuario
// - Feed de publicaciones
// - Usuarios online
```

### 📊 Balance de Efectividad por Archivo

#### Backend - Top 10 Archivos Más Críticos

| Archivo | Tamaño | Complejidad | Efectividad | Acción Requerida |
|---------|--------|-------------|-------------|------------------|
| `groupController.js` | 62KB | 🔴 Alta | ⚠️ Media | Dividir urgente |
| `postController.js` | 44KB | 🔴 Alta | ⚠️ Media | Dividir urgente |
| `iglesiaController.js` | 40KB | 🔴 Alta | ⚠️ Media | Dividir urgente |
| `ministerioController.js` | 35KB | 🟡 Media | ✅ Alta | Refactorizar |
| `fundacionController.js` | 28KB | 🟡 Media | ✅ Alta | Refactorizar |
| `User.model.js` | 16KB | 🔴 Alta | ✅ Alta | Dividir módulos |
| `socketService.js` | 14KB | 🟡 Media | ✅ Alta | Eliminar globales |
| `conversationController.js` | 23KB | 🟡 Media | ⚠️ Media | Refactorizar |
| `reportController.js` | 38KB | 🟡 Media | ✅ Alta | Dividir |
| `adController.js` | 25KB | 🟡 Media | ✅ Alta | OK |

#### Frontend - Top 10 Features Más Críticos

| Feature | Archivos | Complejidad | Efectividad | Acción Requerida |
|---------|----------|-------------|-------------|------------------|
| `iglesias` | ~30 | 🔴 Alta | ⚠️ Media | Bugs z-index, contador |
| `grupos` | ~25 | 🟡 Media | ✅ Alta | Refactorizar sidebar |
| `feed` | ~20 | 🟡 Media | ✅ Alta | Optimizar renders |
| `mensajes` | ~15 | 🟡 Media | ✅ Alta | OK |
| `fundacion` | ~12 | 🟡 Media | ⚠️ Media | Bug redirección |
| `notificaciones` | ~10 | 🟡 Media | ⚠️ Media | Bug redirección |
| `ads` | ~15 | 🟡 Media | ✅ Alta | OK |
| `admin` | ~10 | 🟢 Baja | ✅ Alta | OK |
| `auth` | ~8 | 🟢 Baja | ✅ Alta | OK |
| `reuniones` | ~8 | 🟢 Baja | ✅ Alta | OK |

---

## 📈 Métricas Generales

### Cobertura de Funcionalidades

| Módulo | Completitud | Bugs Conocidos | Prioridad Mejora |
|--------|-------------|----------------|------------------|
| Autenticación | ✅ 100% | 0 | Baja |
| Feed Social | ✅ 95% | 0 | Media |
| Amistades | ✅ 100% | 0 | Baja |
| Mensajería | ✅ 90% | 0 | Media |
| Grupos | ✅ 95% | 1 (sidebar) | Media |
| Iglesias | ⚠️ 85% | 3 (contador, z-index, historial) | Alta |
| Fundación | ⚠️ 80% | 1 (redirección) | Alta |
| Ministerios | ✅ 90% | 0 | Media |
| Publicidad | ✅ 95% | 0 | Baja |
| Moderación | ✅ 90% | 0 | Media |
| Admin/Founder | ✅ 95% | 0 | Baja |

### Deuda Técnica

- **Alta**: 15 archivos (controladores grandes, modelos con arrays)
- **Media**: 30 archivos (código duplicado, falta validación)
- **Baja**: 55 archivos (mejoras menores)

### Estimación de Refactorización

- **Prioridad Alta**: 40-60 horas
- **Prioridad Media**: 60-80 horas
- **Prioridad Baja**: 100+ horas

---

## 🎯 Conclusión

**DegaderSocial V2** es una aplicación compleja y funcional con una arquitectura sólida pero con áreas significativas de mejora. Las funcionalidades core están bien implementadas, pero la escalabilidad y mantenibilidad se ven afectadas por:

1. Controladores monolíticos
2. Modelos con arrays embebidos
3. Falta de capa de servicios
4. Código duplicado y archivos temporales
5. Conflictos de frameworks CSS

**Recomendación Principal**: Priorizar la refactorización de los controladores grandes y la migración de arrays a colecciones separadas antes de agregar nuevas funcionalidades.

---

**Documento generado**: 2026-02-02  
**Archivos analizados**: 492 (100 backend + 392 frontend)  
**Líneas de código estimadas**: ~50,000+
