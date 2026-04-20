# Documentación Técnica: Módulo de Carpetas Avanzadas

**Fecha: Noviembre, 2025**
**Versión: 1.0.0**

**Fecha:** 20 de Abril, 2026
**Versión:** 1.2.0 (Almacenamiento R2 + Filtros Extendidos)
**Estado:** ✅ OPERATIVO

---

> [!TIP]
> ### 💡 RECOMENDACIONES PARA DESARROLLADORES
> * **Almacenamiento:** Los archivos ya se suben a **Cloudflare R2**, no al disco local. Usa `uploadToR2` y `deleteFromR2` del servicio `r2Service.js`.
> * **Permisos:** Siempre usa `tienePermiso()` antes de cualquier operación destructiva. No confíes solo en el rol del usuario; la carpeta puede ser institucional y requerir una validación diferente.
> * **Filtros en GET:** El endpoint `GET /api/folders` soporta query params: `tipo`, `area`, `cargo`, `subArea`, `programa`, `pais`. Combínalos para obtener resultados precisos.

---

## Descripción General
El módulo de carpetas permite a los usuarios gestionar archivos personales, grupales e institucionales. Incluye una lógica avanzada de visibilidad basada en la jerarquía de la Fundación Sol y Luna (FHS&L), permitiendo compartir recursos automáticamente según el cargo, área y ubicación geográfica.

## Modelo de Datos (`Folder.js`)

El modelo `Folder` incluye los siguientes campos clave:
- **tipo**: `personal`, `grupal`, `institucional`.
- **visibilidadPorCargo**: Array de cargos que tienen acceso automático.
- **visibilidadPorArea**: Array de áreas institucionales con acceso. Incluye sub-campos: `areas`, `subAreas`, `programas`.
- **visibilidadPorNivel**: Filtro por nivel jerárquico (Nacional, Regional, Provincial, Municipal).
- **visibilidadGeografica**: Filtros por país, subdivisión y ciudad.
- **compartidaCon**: Lista de usuarios específicos con permisos (`lectura`, `escritura`, `admin`).
- **archivos**: Sub-documentos con metadata de los archivos subidos (URL de R2, nombre, tipo, tamaño).

## Endpoints API

### Carpetas
- `GET /api/folders`: Obtiene carpetas visibles para el usuario (propias + compartidas + jerárquicas). Soporta filtros: `tipo`, `area`, `cargo`, `subArea`, `programa`, `pais`.
- `POST /api/folders`: Crea una nueva carpeta.
  - Body: `{ nombre, descripcion, tipo, areaSeleccionada, nivelInstitucional... }`
- `GET /api/folders/:id`: Obtiene detalle de una carpeta.
- `PUT /api/folders/:id`: Actualiza metadata de la carpeta.
- `DELETE /api/folders/:id`: Eliminación lógica (`activa: false`).

### Archivos
- `POST /api/folders/:id/files`: Sube un archivo (multipart/form-data) → **almacenado en Cloudflare R2**.
- `DELETE /api/folders/:id/files/:fileId`: Elimina el archivo de R2 y su referencia en MongoDB.

### Compartir
- `POST /api/folders/:id/share`: Comparte con un usuario específico.
- `POST /api/folders/:id/share/bulk`: Comparte con múltiples usuarios.
- `POST /api/folders/:id/leave`: Permite a un usuario **salir** de una carpeta compartida.

### Jerarquía
- `GET /api/folders/jerarquia`: Devuelve la estructura oficial de Áreas, Cargos y Niveles.

## Lógica de Jerarquía Institucional

El servicio `jerarquiaResolver.js` maneja la lógica para determinar quién debe ver una carpeta institucional.

### Niveles Soportados
1. **Nacional**: Visible para directores nacionales y subdirectores del área.
2. **Regional**: Visible para directores regionales.
3. **Provincial**: Visible para directores provinciales y coordinadores.
4. **Municipal/Local**: Visible para encargados, profesionales y voluntarios en esa ciudad.

### Flujo de Creación Automática
1. El usuario selecciona "Institucional".
2. Elige Área (ej. "Área de Salud") y Nivel (ej. "Provincial").
3. El backend resuelve los usuarios que coinciden con esos criterios usando `UserV2`.
4. Si se marca "Compartir automáticamente", se agregan a `compartidaCon`.
5. Se guardan los metadatos de visibilidad para que futuros usuarios con ese cargo también tengan acceso.

## Frontend

### Componentes Clave
- `MisCarpetasPage`: Vista principal con toolbar de filtros avanzados.
- `ModalCrearCarpeta`: Formulario inteligente con selectores de jerarquía y preview de alcance.
- `CarpetaDetalle`: Vista de archivos con previsualización y gestión.
- `useCarpetas`: Hook personalizado que centraliza la lógica y el estado.

### Permisos en Frontend
La UI se adapta según los permisos del usuario sobre la carpeta:
- **Lectura**: Solo ver y descargar.
- **Escritura**: Subir y eliminar archivos.
- **Admin**: Editar carpeta, compartir y eliminar carpeta.

## Consideraciones de Seguridad
- Todas las rutas están protegidas por `authenticate`.
- Se valida `tienePermiso()` en cada operación sensible.
- Los archivos se almacenan en Cloudflare R2 con nombres aleatorios (crypto) para evitar enumeración.
- Validación estricta de tipos MIME en subida de archivos.

---

**Actualizado por:** Antigravity AI
**Referencia de Código:** `src/controllers/folderController.js`, `src/services/jerarquiaResolver.js`
