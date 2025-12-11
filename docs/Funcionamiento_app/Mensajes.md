# Mensajes - Sistema de Mensajería

## 📋 Descripción General
Sistema de mensajería privada entre usuarios con soporte para mensajes en tiempo real.

---

## 🔧 Componentes Principales

### Backend

#### Endpoints Principales
- `GET /api/mensajes` - Obtener conversaciones
- `GET /api/mensajes/:userId` - Obtener mensajes con un usuario
- `POST /api/mensajes/:userId` - Enviar mensaje
- `DELETE /api/mensajes/:messageId` - Eliminar mensaje

### Frontend

#### Componentes
- `MensajesPage.jsx` - Página principal de mensajes
- `ConversationList.jsx` - Lista de conversaciones
- `ChatWindow.jsx` - Ventana de chat
- `MessageBubble.jsx` - Burbuja de mensaje

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/Message.model.js`
- `src/controllers/message.controller.js`
- `src/routes/message.routes.js`

**Frontend:**
- `src/pages/MensajesPage.jsx`
- `src/components/MailSidebar.jsx`

---

## 📚 Notas

*Este archivo será completado con más detalles en el futuro.*
