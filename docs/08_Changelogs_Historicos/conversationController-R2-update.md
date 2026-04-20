# 💬 Actualización de conversationController.js - Soporte Cloudflare R2

**Fecha: 26 de Diciembre, 2025**
**Versión: 1.0.0**

**Fecha:** 20 de Abril, 2026
**Versión:** 2.2.0 (Optimización de Imágenes, Idempotencia y Message Requests)
**Estado:** ✅ COMPLETADO Y OPTIMIZADO

---

> [!TIP]
> ### 💡 RECOMENDACIONES PARA DESARROLLADORES
> * **Idempotencia:** Todo mensaje enviado DEBE incluir un `clientMessageId` generado por el frontend. Si el usuario pierde conexión y reenvía, el backend detecta el duplicado y devuelve el mensaje existente sin crear otro. Nunca omitas este campo.
> * **Optimización de Imágenes:** Las imágenes se procesan automáticamente con `sharp` generando 3 tamaños (small, medium, large) y un `blurHash`. Usa el `small` para previews y el `large` para vista completa.
> * **Archivos Múltiples:** Actualmente solo se procesa el **primer archivo** de `req.files`. Si en el futuro necesitas enviar varios adjuntos en un solo mensaje, deberás expandir el loop en `sendMessage`.
> * **Message Requests:** Si dos usuarios NO son amigos, la conversación se crea con `messageRequestStatus: 'pending'`. El receptor debe aceptarla antes de que aparezca en su bandeja principal.

---

## ✅ Cambios Implementados (Estado Real del Código)

### Backend - `src/controllers/conversationController.js`
- ✅ Importación de `uploadToR2`, `deleteFromR2` y `processAndUploadImage`
- ✅ Procesamiento de archivos adjuntos (`req.files`) con subida a R2
- ✅ Detección automática de tipo (imagen/video/audio/documento)
- ✅ **Optimización de imágenes** con `sharp` (multi-resolución + blurHash)
- ✅ **Idempotencia estricta** con `clientMessageId` y `findOneAndUpdate`
- ✅ Validación flexible: permite enviar solo archivos sin texto
- ✅ **Message Requests**: Aceptar/Rechazar solicitudes de conversación
- ✅ **Archivado/Destacado/Vaciado** individual por usuario
- ✅ **Paginación con cursor compuesto** (`createdAt` + `_id`)

---

## 📊 Flujo de Trabajo Completo

### Enviar Mensaje con Archivo (Flujo Real)

```
Frontend (FormData + clientMessageId)
    ↓
POST /api/conversaciones/:id/message
    ↓
Middleware: uploadConversationFiles (hasta 5 archivos, 50MB c/u)
    ↓
Controller: sendMessage
    ↓
¿Es imagen?
  SÍ → processAndUploadImage() → 3 tamaños + blurHash → R2
  NO → uploadToR2() directo → R2
    ↓
MongoDB: Message { archivo: { url, small, medium, large, blurHash } }
    ↓
Idempotencia: findOneAndUpdate con $setOnInsert (evita duplicados)
    ↓
Socket.IO: emitMessage() → sala de conversación + sala personal
    ↓
¿Receptor está en el chat?
  SÍ → Solo socket, sin push
  NO → Firebase Push (persist: false)
    ↓
Response 201: Mensaje procesado
```

---

## 📝 Estructura de Datos del Mensaje (MongoDB)

### Mensaje con Imagen (Optimizado)
```javascript
{
  _id: ObjectId("..."),
  conversationId: ObjectId("..."),
  sender: ObjectId("..."),
  contenido: "Mira esta foto!",
  tipo: "imagen",
  clientMessageId: "uuid-generado-por-frontend",
  estado: "enviado", // → "entregado" → "leido"

  // Archivo en R2 (con múltiples resoluciones)
  archivo: {
    url: "https://pub-xxx.r2.dev/messages/large_abc123.webp",
    small: "https://pub-xxx.r2.dev/messages/small_abc123.webp",
    medium: "https://pub-xxx.r2.dev/messages/medium_abc123.webp",
    large: "https://pub-xxx.r2.dev/messages/large_abc123.webp",
    blurHash: "LKO2?U%2Tw=w]~RBVZRi...",
    nombre: "foto.jpg",
    tipo: "image/jpeg",
    tamaño: 1024567
  },

  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Mensaje con Documento/Video/Audio
```javascript
{
  tipo: "archivo", // o "video", "audio"
  archivo: {
    url: "https://pub-xxx.r2.dev/messages/abc123.pdf",
    nombre: "contrato.pdf",
    tipo: "application/pdf",
    tamaño: 2048000
  }
}
```

---

## 🔐 Sistema de Message Requests

Cuando dos usuarios **NO son amigos**, la conversación se comporta como Instagram DMs:

| Acción | Endpoint | Descripción |
| :--- | :--- | :--- |
| Crear conversación | `POST /api/conversaciones/with/:userId` | Si no son amigos, se crea con `status: pending` |
| Aceptar solicitud | `PUT /api/conversaciones/:id/accept-request` | Solo el receptor puede aceptar |
| Rechazar solicitud | `PUT /api/conversaciones/:id/decline-request` | Oculta la conversación para el receptor |

---

## 🎯 Tipos de Archivos Soportados

### Detección Automática de Tipo:

| MIME Type | Tipo Detectado | Procesamiento |
|-----------|----------------|---------------|
| `image/*` | `imagen` | **Optimizado** (3 resoluciones + blurHash) |
| `video/*` | `video` | Subida directa a R2 |
| `audio/*` | `audio` | Subida directa a R2 |
| Otros | `archivo` | Subida directa a R2 |

### Formatos Permitidos:
**Imágenes:** `.jpg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`
**Videos:** `.mp4`, `.webm`, `.mov`, `.avi`, `.wmv`, `.mkv`
**Audio:** `.mp3`, `.wav`, `.ogg`, `.m4a`
**Documentos:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`
**Comprimidos:** `.zip`, `.rar`, `.7z`

---

## 🔒 Validaciones y Límites

- ✅ Máximo **5 archivos** por mensaje (middleware)
- ✅ Máximo **50 MB** por archivo
- ✅ `clientMessageId` **obligatorio** (sin él, el servidor devuelve 400)
- ✅ Contenido **opcional** si hay archivos adjuntos

### Validación Flexible:
```javascript
// ✅ Válido: Solo texto
{ contenido: "Hola!", clientMessageId: "uuid" }

// ✅ Válido: Solo archivo
{ clientMessageId: "uuid", attachments: [file] }

// ✅ Válido: Texto + archivo
{ contenido: "Mira esto", clientMessageId: "uuid", attachments: [file] }

// ❌ Inválido: Sin contenido ni archivos
{ clientMessageId: "uuid" }

// ❌ Inválido: Sin clientMessageId
{ contenido: "Hola!" }
```

---

## 📡 Funcionalidades Avanzadas del Chat

### Gestión Individual de Conversaciones
Cada usuario puede realizar estas acciones **sin afectar al otro participante**:

| Acción | Endpoint | Efecto |
| :--- | :--- | :--- |
| Archivar/Desarchivar | `PUT /:id/archive` | Toggle, mueve a pestaña "Archivados" |
| Destacar/Quitar | `PUT /:id/star` | Toggle, marca como favorita |
| Vaciar historial | `PUT /:id/clear` | Oculta mensajes anteriores a la fecha actual |
| Eliminar chat | `DELETE /:id` | Oculta + vacía. Si llega un mensaje nuevo, reaparece vacía |

### Paginación con Cursor Compuesto
```javascript
// Primera carga: sin cursor
GET /api/conversaciones/:id

// Cargar más mensajes antiguos:
GET /api/conversaciones/:id?cursorAt=2026-04-20T10:00:00Z&cursorId=6620abc...&limit=50
```
Esto evita duplicados y es mucho más eficiente que `skip/limit`.

---

## 📊 Comparación: Antes vs Ahora

| Característica | v1.0 (Dic 2025) | v2.2 (Abr 2026) |
|----------------|-----------------|-----------------|
| Almacenamiento | Local (`uploads/messages/`) | Cloudflare R2 |
| Archivos por mensaje | 1 | 1 (middleware acepta 5, código procesa 1) |
| Tamaño máximo | 10 MB | 50 MB |
| Tipos soportados | Imagen, Video | Imagen, Video, Audio, Documentos |
| URLs | Relativas | Públicas (CDN) |
| Optimización de imágenes | ❌ No | ✅ Multi-resolución + blurHash |
| Idempotencia | ❌ No | ✅ clientMessageId obligatorio |
| Message Requests | ❌ No | ✅ Aceptar/Rechazar (estilo Instagram) |
| Paginación | skip/limit | ✅ Cursor compuesto |

---

## 🚀 Próximos Pasos (Roadmap)

1. ⏳ **Soportar Múltiples Archivos** procesados en un solo mensaje (actualmente solo el primero)
2. ⏳ **Previews de documentos** (thumbnails para PDFs)
3. ⏳ **Mensajes de voz** grabados desde el frontend
4. ⏳ **Reacciones a mensajes** (emojis)

---

**Actualizado por:** Antigravity AI
**Referencia de Código:** `src/controllers/conversationController.js` (707 líneas)
