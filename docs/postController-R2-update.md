# 📸 Actualización de postController.js - Soporte Cloudflare R2

## ✅ Cambios Realizados

Se ha actualizado exitosamente el controlador de publicaciones para soportar la subida de **imágenes y videos a Cloudflare R2**.

---

## 🔧 Archivos Modificados

### 1. **`src/controllers/postController.js`**

#### Cambios principales:
- ✅ Importación del servicio R2: `uploadToR2` y `deleteFromR2`
- ✅ Procesamiento de múltiples archivos subidos (`req.files`)
- ✅ Clasificación automática de archivos por tipo (imagen/video)
- ✅ Subida a Cloudflare R2 en la carpeta `posts/`
- ✅ Mantenimiento de compatibilidad con sistema base64 legacy

#### Lógica de procesamiento:
```javascript
// Prioridad 1: Archivos subidos (FormData) → R2
if (req.files && req.files.length > 0) {
  // Subir a R2 y clasificar por tipo
}
// Prioridad 2: Base64 (JSON body) → Legacy
else {
  // Usar imágenes/videos en base64
}
```

---

### 2. **`src/middleware/upload.middleware.js`**

#### Nuevo middleware agregado:
```javascript
const uploadPostMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter: mediaFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB por archivo
}).array('media', 10); // Hasta 10 archivos
```

#### Características:
- ✅ Soporta hasta **10 archivos** simultáneos
- ✅ Límite de **50 MB** por archivo
- ✅ Acepta imágenes y videos
- ✅ Almacenamiento en memoria para R2

---

### 3. **`src/routes/post.routes.js`**

#### Actualización del middleware condicional:
```javascript
const conditionalUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Usar uploadPostMedia para múltiples archivos
    uploadPostMedia(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  } else {
    // JSON (base64) pasa directo
    next();
  }
};
```

---

### 4. **`src/services/r2Service.js`**

#### Tipos de archivos soportados expandidos:

**Imágenes:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`

**Videos:**
- `.mp4`, `.webm`, `.mov`, `.avi`, `.wmv`, `.mkv`

**Audio:**
- `.mp3`, `.wav`, `.ogg`, `.m4a`

**Documentos:**
- `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`

---

## 📊 Flujo de Trabajo

### Crear Publicación con Archivos

```
Frontend (FormData)
    ↓
POST /api/publicaciones
    ↓
Middleware: uploadPostMedia
    ↓ (req.files)
Controller: createPost
    ↓
uploadToR2(file.buffer, file.originalname, 'posts')
    ↓
Cloudflare R2: https://pub-xxxxx.r2.dev/posts/xxxxx.jpg
    ↓
MongoDB: Post { images: [{ url: "https://..." }] }
    ↓
Response: Post creado exitosamente
```

---

## 🧪 Cómo Usar

### Opción 1: FormData (Recomendado - R2)

```javascript
const formData = new FormData();
formData.append('contenido', 'Mi publicación con imágenes');
formData.append('privacidad', 'publico');
formData.append('media', imageFile1); // File object
formData.append('media', imageFile2);
formData.append('media', videoFile);

const response = await fetch('/api/publicaciones', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Opción 2: JSON con Base64 (Legacy)

```javascript
const response = await fetch('/api/publicaciones', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contenido: 'Mi publicación',
    privacidad: 'publico',
    images: ['data:image/png;base64,iVBORw0KGgoAAAA...'],
    videos: ['data:video/mp4;base64,AAAAIGZ0eXBpc29t...']
  })
});
```

---

## 📝 Estructura de Datos

### Post con Multimedia (MongoDB)

```javascript
{
  _id: ObjectId("..."),
  usuario: ObjectId("..."),
  contenido: "Mi publicación con multimedia",
  privacidad: "publico",
  
  // Imágenes en R2
  images: [
    { 
      url: "https://pub-xxxxx.r2.dev/posts/abc123.jpg",
      alt: ""
    },
    { 
      url: "https://pub-xxxxx.r2.dev/posts/def456.png",
      alt: ""
    }
  ],
  
  // Videos en R2
  videos: [
    { 
      url: "https://pub-xxxxx.r2.dev/posts/video789.mp4",
      thumbnail: "",
      title: ""
    }
  ],
  
  likes: [],
  comentarios: [],
  compartidos: [],
  etiquetas: [],
  grupo: null,
  
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## 🔒 Validaciones

### Límites de Archivos:
- ✅ Máximo **10 archivos** por publicación
- ✅ Máximo **50 MB** por archivo
- ✅ Solo imágenes y videos permitidos

### Tipos MIME Permitidos:
```javascript
// Imágenes
image/jpeg, image/png, image/gif, image/webp

// Videos
video/mp4, video/avi, video/mov, video/wmv
```

---

## ⚠️ Notas Importantes

1. **Compatibilidad Retroactiva**: El sistema sigue soportando base64 para no romper el frontend existente.

2. **Prioridad R2**: Si se envían archivos en FormData, se ignoran los campos `images` y `videos` del body JSON.

3. **Logs Detallados**: El controlador tiene logs extensivos para debugging:
   - `📝 [CREATE POST]` - Información general
   - `📤 [CREATE POST]` - Subida a R2
   - `✅ [CREATE POST]` - Éxito
   - `❌ [CREATE POST]` - Errores

4. **Manejo de Errores**: Si un archivo falla al subir a R2, se continúa con los demás archivos.

---

## 🚀 Próximos Pasos Recomendados

1. ✅ **Actualizar Frontend** para usar FormData en lugar de base64
2. ⏳ **Actualizar conversationController.js** para archivos en mensajes privados
3. ⏳ **Actualizar iglesiaController.js** para archivos en mensajes de iglesia
4. ⏳ **Migrar folderController.js** de almacenamiento local a R2
5. ⏳ **Actualizar adController.js** para creatividades de anuncios

---

## 📞 Testing

### Endpoint de Prueba:
```bash
POST http://localhost:3001/api/publicaciones
```

### Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Body (FormData):
```
contenido: "Publicación de prueba"
privacidad: "publico"
media: [archivo1.jpg]
media: [archivo2.png]
media: [video1.mp4]
```

---

## ✅ Checklist de Verificación

- [x] Servicio R2 configurado y funcionando
- [x] Middleware `uploadPostMedia` creado
- [x] Controller `createPost` actualizado
- [x] Rutas actualizadas con nuevo middleware
- [x] Tipos MIME expandidos en r2Service
- [x] Compatibilidad con base64 mantenida
- [x] Logs de debugging implementados
- [x] Documentación creada

---

**Fecha de Actualización**: 2025-12-26  
**Autor**: Antigravity AI  
**Estado**: ✅ Completado
