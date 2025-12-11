# Amigos - Sistema de Amistades

## 📋 Descripción General
Sistema para gestionar solicitudes de amistad, lista de amigos y búsqueda de usuarios.

---

## 🔧 Componentes Principales

### Backend

#### Endpoints Principales
- `GET /api/usuarios/friends` - Obtener lista de amigos
- `POST /api/usuarios/friend-request/:id` - Enviar solicitud de amistad
- `PUT /api/usuarios/friend-request/:id/accept` - Aceptar solicitud
- `DELETE /api/usuarios/friend/:id` - Eliminar amigo

### Frontend

#### Componentes
- `FriendsList.jsx` - Lista de amigos
- `FriendCard.jsx` - Tarjeta de amigo
- `FriendRequests.jsx` - Solicitudes pendientes
- `SearchUsers.jsx` - Búsqueda de usuarios

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/User.model.js` - Campo `amigos` en el modelo
- `src/controllers/user.controller.js`
- `src/routes/user.routes.js`

**Frontend:**
- `src/components/FriendsList.jsx`
- `src/components/FriendCard.jsx`

---

## 📚 Notas

*Este archivo será completado con más detalles en el futuro.*
