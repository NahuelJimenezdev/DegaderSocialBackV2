# Institución - Gestión de Instituciones

## 📋 Descripción General
Sistema para gestionar instituciones (iglesias, fundaciones), con solicitudes de ingreso y aprobación jerárquica.

---

## 🔧 Componentes Principales

### Backend

#### Endpoints Principales
- `GET /api/instituciones` - Obtener instituciones
- `POST /api/instituciones` - Crear institución
- `POST /api/instituciones/:id/join` - Solicitar unirse
- `PUT /api/instituciones/:id/approve/:userId` - Aprobar solicitud

### Frontend

#### Componentes
- `IglesiaPage.jsx` - Página de institución
- `InstitutionMembers.jsx` - Lista de miembros
- `JoinRequests.jsx` - Solicitudes pendientes

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/User.model.js` - Campo `fundacion` con sistema de aprobación
- `src/controllers/institution.controller.js`
- `src/routes/institution.routes.js`

**Frontend:**
- `src/pages/IglesiaPage.jsx`

---

## 📚 Notas

*Este archivo será completado con más detalles en el futuro.*

**Sistema de Aprobación Jerárquica:**
El modelo User incluye campos para gestionar aprobaciones:
- `estadoAprobacion` - Estado de la solicitud
- `aprobadoPor` - Quién aprobó
- `fechaAprobacion` - Cuándo se aprobó
- `motivoRechazo` - Razón de rechazo
