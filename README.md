# 🚀 Degader Social Backend V2

¡Bienvenido al motor central de **Degader Social**! Esta es una API REST & Real-Time de alto rendimiento diseñada para gestionar una red social compleja, integrando módulos administrativos para fundaciones e iglesias, y sistemas de gamificación avanzada.

---

## 🌟 Características Principales

*   **🔐 Seguridad de Grado Industrial:** Autenticación JWT con Argon2, protección contra Rate Limiting y auditoría de tokens.
*   **⚡ Tiempo Real (Socket.IO):** Notificaciones instantáneas, chat en vivo, indicadores de escritura y presencia (Online/Offline).
*   **🛡️ Módulos Especializados:**
    *   **Fundación:** Gestión de documentación (FHSYL, Entrevistas) y jerarquías.
    *   **Iglesias:** Control de membresías, ministerios y roles eclesiásticos.
*   **🎮 Gamificación (Arena):** Sistema de rangos, economía virtual y recompensas por actividad.
*   **📦 Almacenamiento Híbrido:** Upload de imágenes con Sharp (procesamiento) y almacenamiento compatible con S3 (Cloudflare R2).
*   **🔄 Infraestructura Robusta:** Redis para caché/idempotencia y Workers en segundo plano para tareas pesadas.

---

## 📋 Requisitos para Desarrolladores

*   **Node.js:** v20 LTS (Recomendado)
*   **MongoDB Atlas:** Base de datos NoSQL.
*   **Redis:** (Opcional en Dev, requerido para Idempotencia en Prod).
*   **npm:** Manejador de paquetes.

---

## 🔧 Guía de Inicio Rápido (Juniors)

1. **Instalación:**
   ```bash
   npm install
   ```

2. **Configuración:**
   Crea o verifica tu archivo `.env` en la raíz. Asegúrate de tener las claves de `MONGODB_URI` y `JWT_SECRET`.

3. **Ejecución:**
   ```bash
   # Modo Desarrollo con auto-recarga
   npm run dev
   ```
   *El servidor subirá en `http://localhost:3001`*

---

## 📡 Mapa de la API (Endpoints Clave)

| Módulo | Endpoint Base | Funcionalidad |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | Registro, Login y Gestión de Sesión. |
| **Social** | `/api/publicaciones` | Feed, Likes, Comentarios y Shares. |
| **Amigos** | `/api/amistades` | Solicitudes y filtrado de bloqueos. |
| **Chat** | `/api/conversaciones` | Mensajería privada en tiempo real. |
| **Fundación** | `/api/fundacion` | Hoja de Vida, Entrevistas y Aprobaciones. |
| **Iglesia** | `/api/iglesias` | Gestión de miembros y ministerios. |
| **Arena** | `/api/arena` | Ranking, Retos y Logros. |
| **Economía** | `/api/economy` | Moneda virtual y transacciones. |

---

## 📁 Estructura del Tesoro (Arquitectura)

```text
DegaderSocialBackV2/
├── src/
│   ├── controllers/      # ¿Qué hace el código? (Lógica)
│   ├── models/           # ¿Cómo lucen los datos? (Esquemas)
│   ├── routes/           # ¿Por dónde entra la petición? (Endpoints)
│   ├── middleware/       # ¿Quién puede pasar? (Seguridad/Filtros)
│   ├── services/         # Herramientas externas (Redis, Socket, Cloud)
│   ├── modules/          # Lógica compleja aislada (Arena, Economy)
│   ├── workers/          # Tareas que corren solas en el fondo
│   └── index.js          # El corazón que arranca todo
├── scripts/              # Herramientas para admins (Reset pass, Migraciones)
├── uploads/              # Almacenamiento local de archivos
└── docs/                 # Guías de implementación (¡Léelas!)
```

---

## 🐛 Solución de Problemas Comunes

*   **"No puedo conectar a la DB":** Revisa que tu IP esté en la lista blanca de MongoDB Atlas.
*   **"Error con librerías de imágenes":** Si usas Docker en Windows, asegúrate de que el `.dockerignore` esté presente para evitar conflictos con `sharp`.
*   **"Socket.IO no conecta":** Verifica que el frontend apunte al puerto `3001` y que el token JWT sea válido.

---

## 📚 Tecnologías del Ecosistema

*   **Backend:** Node.js + Express
*   **DB:** MongoDB + Mongoose
*   **Real-Time:** Socket.IO
*   **Cache:** Redis (ioredis)
*   **Cloud/Storage:** AWS SDK (Cloudflare R2) + Firebase Admin (Push)
*   **Seguridad:** Argon2 + JWT + Helmet + Express-Rate-Limit

---

## 📄 Notas de Versión

**Versión Actual:** 2.3.5 (Social & Foundation Integrated)
**Última Actualización:** 20 de Abril, 2026

---

**Desarrollado con ❤️ por el equipo de Degader Social.**
