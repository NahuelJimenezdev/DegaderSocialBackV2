# Documentación Técnica: Módulo de Carpetas Avanzadas

## Descripción General
El módulo de carpetas permite a los usuarios gestionar archivos personales, grupales e institucionales. Incluye una lógica avanzada de visibilidad basada en la jerarquía de la Fundación Sol y Luna (FHS&L), permitiendo compartir recursos automáticamente según el cargo, área y ubicación geográfica.

## Modelo de Datos (`Folder.js`)

El modelo `Folder` incluye los siguientes campos clave:
- **tipo**: `personal`, `grupal`, `institucional`.
- **visibilidadPorCargo**: Array de cargos que tienen acceso automático.
- **visibilidadPorArea**: Array de áreas institucionales con acceso.
- **visibilidadGeografica**: Filtros por país, provincia y ciudad.
- **compartidaCon**: Lista de usuarios específicos con permisos (`lectura`, `escritura`, `admin`).
- **archivos**: Sub-documentos con metadata de los archivos subidos.

## Endpoints API

### Carpetas
- `GET /api/folders`: Obtiene carpetas visibles para el usuario (propias + compartidas + jerárquicas). Soporta filtros: `tipo`, `area`, `cargo`, `pais`.
- `POST /api/folders`: Crea una nueva carpeta.
  - Body: `{ nombre, descripcion, tipo, areaSeleccionada, nivelInstitucional... }`
- `GET /api/folders/:id`: Obtiene detalle de una carpeta.
- `PUT /api/folders/:id`: Actualiza metadata de la carpeta.
- `DELETE /api/folders/:id`: Eliminación lógica (`activa: false`).

### Archivos
- `POST /api/folders/:id/files`: Sube un archivo (multipart/form-data).
- `DELETE /api/folders/:id/files/:fileId`: Elimina un archivo físico y su referencia.

### Compartir
- `POST /api/folders/:id/share`: Comparte con un usuario específico.
- `POST /api/folders/:id/share/bulk`: Comparte con múltiples usuarios.

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
- Los archivos se almacenan en carpetas con IDs aleatorios para evitar enumeración.
- Validación estricta de tipos MIME en subida de archivos.
