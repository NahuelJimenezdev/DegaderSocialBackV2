# Mis Carpetas - Sistema de Carpetas y Archivos

## 📋 Descripción General
Sistema para organizar y gestionar carpetas y archivos personales del usuario.

---

## 🔧 Componentes Principales

### Backend

#### Endpoints Principales
- `GET /api/carpetas` - Obtener carpetas del usuario
- `POST /api/carpetas` - Crear nueva carpeta
- `POST /api/carpetas/:id/upload` - Subir archivo
- `DELETE /api/carpetas/:id` - Eliminar carpeta

### Frontend

#### Componentes
- `MisCarpetasPage.jsx` - Página de carpetas
- `FolderTree.jsx` - Árbol de carpetas
- `FileList.jsx` - Lista de archivos
- `UploadFile.jsx` - Componente de subida

---

## 🔗 Archivos Relacionados

**Backend:**
- `src/models/Folder.model.js`
- `src/models/File.model.js`
- `src/controllers/folder.controller.js`
- `src/routes/folder.routes.js`

---

## 📚 Notas

*Este archivo será completado con más detalles en el futuro.*
