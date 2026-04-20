# 📚 Funcionamiento de la Aplicación DegaderSocial

**Fecha:** 20 de Abril, 2026
**Versión:** 2.0.0 (Auditoría Integral y Mapa Completo de Rutas)

---

## 🎯 Mapa Completo de Módulos y API Backend

El backend de DegaderSocial V2 está compuesto por **26 módulos de negocio activos** (verificables en `src/index.js`). A continuación se detalla para qué sirve cada uno y sus rutas base:

### 1. 🌐 Core Social (Usuario y Comunidades)
| Módulo | Ruta Base | Descripción | Funcionalidad Principal |
|--------|-----------|-------------|-------------------------|
| **Autenticación** | `/api/auth` | Login, registro y sesión | Emisión de JWT, login de usuarios (Argon2), validación. |
| **Usuarios** | `/api/usuarios` | Gestión de perfiles UserV2 | Editar biografía, intereses y ubicaciones personales. |
| **Publicaciones** | `/api/publicaciones`| Feed principal y posts | Crear posts, likes, comentarios, compartir, privacidad. |
| **Amistades** | `/api/amistades` | Compatibilidad legacy | Usado por apps anteriores (En transición). |
| **Friendships** | `/api/friendships` | Sistema amistades V2 | Solicitudes de amistad, listar amigos de una persona. |
| **Grupos** | `/api/grupos` | Comunidades temáticas | Establecer roles, foro privado, y chat grupal. |

### 2. ⛪ Institucional y Organizativo
| Módulo | Ruta Base | Descripción | Funcionalidad Principal |
|--------|-----------|-------------|-------------------------|
| **Iglesias** | `/api/iglesias` | Gestión eclesiástica | CRUD de iglesias, admisiones, panel del pastor, ex-miembros. |
| **Fundación** | `/api/fundacion` | FHS&L Documental | Gestión territorial, formularios de Hoja de vida y Entrevistas. |
| **Ministerios** | `/api/ministerios` | Organización eclesiástica | Asignación de roles como Música, Jóvenes, Diáconos. |
| **Reuniones** | `/api/reuniones` | Eventos (Meetings) | Citas con horario, videollamadas y calendarios. |

### 3. 💬 Comunicación y Almacenamiento
| Módulo | Ruta Base | Descripción | Funcionalidad Principal |
|--------|-----------|-------------|-------------------------|
| **Conversaciones** | `/api/conversaciones`| Mensajería P2P | Chat 1 a 1, Message Requests estilo IG, archivos a R2. |
| **Notificaciones** | `/api/notificaciones`| Avisos en tiempo real | Alertas push al unirse a grupos o likes (con Socket.IO). |
| **Carpetas** | `/api/folders` | Disco Nube Institucional | Almacenamiento de archivos en Cloudflare R2 con permisos. |

### 4. 🛡️ Administración, Moderación y Soporte
| Módulo | Ruta Base | Descripción | Funcionalidad Principal |
|--------|-----------|-------------|-------------------------|
| **Administración** | `/api/admin` | Panel de staff (Admin) | Analíticas globales, banear perfiles de manera manual. |
| **Founder** | `/api/founder` | Panel super-usuario | Accesos para el Founder: ver Logs de Auditoría totales. |
| **Reportes** | `/api/reports` | Moderación comunitaria | Sistema de denuncias que hacen los usuarios sobre posts. |
| **Tickets** | `/api/tickets` | Soporte al cliente | Formulario de centro de asistencia técnica in-app. |

### 5. 🎮 Monetización y Engagement
| Módulo | Ruta Base | Descripción | Funcionalidad Principal |
|--------|-----------|-------------|-------------------------|
| **Ads (Publicidad)** | `/api/ads` | Sistema de Campañas | Creación de publicidad segmentada, billetera de clientes. |
| **Arena** | `/api/arena` | Gamificación y Retos | Sistema de puntos o batallas en la comunidad. |
| **Economía** | `/api/economy` | Cripto/Saldo Virtual | Balance de billetera, economía de la aplicación para transacciones. |

### 6. ⚙️ Utilidades y Extensiones
| Módulo | Ruta Base | Descripción | Funcionalidad Principal |
|--------|-----------|-------------|-------------------------|
| **Buscador** | `/api/buscar` | Universal Search | Búsqueda masiva optimizada descartando perfiles bloqueados. |
| **Onboarding** | `/api/onboarding` | Tour Guiado Interactivo | Control de progreso de nuevos usuarios aprendiendo a usar la app. |
| **Uploads** | `/api/upload` | Subida directa a R2 | Endpoints genéricos para procesar imágenes con *Sharp*. |
| **Compartir** | `/api/share` | Links externos URL | Constructor de OpenGraph MetaTags para WhatsApp/FB. |
| **Favoritos** | `/api/favoritos` | Saved Items | Guardar posts o elementos institucionales para más tarde. |
| **Salud Servidor** | `/health` | Heartbeat & Status | Consulta si Redis, MongoDB y el Contenedor Docker están Ready. |

---

## 📂 Estado Real de la Documentación (Por módulo)

### 🏆 Documento Maestro Integral
| Archivo | Contenido |
|---------|-----------|
| **[Funcionamiento_Global_DegaderSocial.md](./Funcionamiento_Global_DegaderSocial.md)** | Documento crítico: Contiene el inventario de Front/Back y auditoría técnica general. |

### ✅ Documentación Completa Confirmada
| Archivo .md | Corresponde con Módulos (Rutas API) |
|-------------|------------------------------------|
| **`Login.md`** | `/api/auth` (JWT + Argon2) |
| **`Perfil.md`** | `/api/usuarios` (Edición UserV2) |
| **`Grupos.md`** | `/api/grupos` |
| **`Iglesias.md`** | `/api/iglesias` |
| **`MisReuniones.md`** | `/api/reuniones` |
| **`Notificaciones.md`** | `/api/notificaciones` (Lista de +20 tipos) |
| **`SistemaPublicidad.md`** / **`Dashboard...`** | `/api/ads` |
| **`../carpetas.md`** | `/api/folders` (Está en la carpeta superior) |
| **`../conversationController-R2-update.md`**| `/api/conversaciones` |
| **`../SEARCH_FUNCTIONALITY_STATUS.md`** | `/api/buscar` |

### ❌ Módulos Pendientes de Ser Documentados - (YA SE REALIZO LA DOCUMENTACION)
Actualmente los siguientes módulos funcionales de producción carecen de archivo `.md`:
1. **Fundación** (`/api/fundacion`)
2. **Ministerios** (`/api/ministerios`)
3. **Centro Administrativo & Moderador** (`/api/admin`, `/api/founder`, `/api/reports`, `/api/tickets`)
4. **Gamificación y Saldo** (`/api/arena`, `/api/economy`)
5. **Onboarding / Tour Guiado** (`/api/onboarding`)

### ⚠️ Placeholders Desactualizados (PELIGROSO)
Tenemos archivos creados en 2024 que fueron dejados como "plantillas vacías". Poseen endpoints e información que ya no apuntan a la realidad del código fuente. **Te recomendamos verificar el código y las rutas exactas en lugar de fiarte plenamente en ellos si están referenciados aquí**:
* `Inicio.md` (Apunta a posts de manera muy vieja)
* `Amigos.md` (Usa URL inexistente)
* `Mensajes.md` (Usa URL inexistente)
* `MisCarpetas.md` (Usa URL inexistente)
* `Institucion.md` (No existe controlador InstitutionController)

---

## 🚨 Reglas Importantes de Mantenimiento

### **1. NO DUPLICAR CÓDIGO Y SERVICIOS**
Si una funcionalidad universal (Ej: `uploadToR2`, o envío de notificaciones en `socketService.js`) existe y funciona, reutilízala importando el módulo.

### **2. ESTRICTA GESTIÓN DEL FLUJO DE DATOS EN BD**
Nunca obtengas documentos gigantes (ej. `User.find()`) sin el `.select({...})`. Arrastrar perfiles completos en colecciones grandes cuelga el servidor. Revisa `CAROUSEL_RECOMENDACIONES.md`.

### **3. CONOCER LAS DEPENDENCIAS ANTES DE CORREGIR**
Los recursos grandes como Iglesias `/api/iglesias` manejan historiales, multimedia y estados. Si se cambia la definición del Model Mongoose, todos los controladores alrededor se caen. Revisa en el Documento **"Funcionamiento_Global"** a donde apunta cada cosa.

---

**Arquitectura:** VPS Hostinger / Docker Compose / Node.js 20 / MongoDB / Redis / Multer / Cloudflare R2
