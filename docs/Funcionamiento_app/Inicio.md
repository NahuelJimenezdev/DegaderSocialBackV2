# Inicio - Página Principal y Feed

## 📋 Descripción General
La página de inicio muestra el feed principal con publicaciones de amigos, grupos e instituciones.

---

## 🔧 Componentes Principales

### Backend

#### Endpoints Principales
- `GET /api/posts` - Obtener publicaciones del feed
- `POST /api/posts` - Crear nueva publicación
- `PUT /api/posts/:id/like` - Dar like a una publicación
- `POST /api/posts/:id/comment` - Comentar en una publicación
- `POST /api/posts/:id/share` - Compartir publicación

### Frontend

#### Componentes
- `HomePage.jsx` - Página principal
- `Feed.jsx` - Lista de publicaciones
- `PostCard.jsx` - Tarjeta individual de publicación
- `CreatePost.jsx` - Formulario para crear publicación
- `CommentSection.jsx` - Sección de comentarios

---

## ⚠️ Errores Comunes

### 1. **Posts No Se Cargan**
**Solución:**
- Verificar que el backend esté corriendo
- Verificar la conexión a MongoDB
- Revisar que el token de autenticación sea válido

### 2. **Likes No Se Actualizan en Tiempo Real**
**Solución:**
- Verificar configuración de Socket.IO
- Asegurarse de que se emita evento `post-liked`
- Actualizar estado local después de dar like

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/Post.model.js`
- `src/controllers/post.controller.js`
- `src/routes/post.routes.js`

**Frontend:**
- `src/pages/HomePage.jsx`
- `src/components/Feed.jsx`
- `src/components/PostCard.jsx`

---

## 📚 Notas

*Este archivo será completado con más detalles en el futuro.*
