# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.6.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.5.3...v1.6.0) (2026-01-30)


### Features

* **notificaciones:** implementadas notificaciones para mensajes de chat de iglesias ([4edd403](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/4edd403f4efb2dd83f1e6ff6baba4ef995346043))

### [1.5.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.5.2...v1.5.3) (2026-01-30)


### Bug Fixes

* **backend:** handlers de socket joinRoom y alias de modelo Ministerio ([0ad82a8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0ad82a82f671926d0d6cb3fdbf7545853b64e974))

### [1.5.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.5.1...v1.5.2) (2026-01-29)


### Bug Fixes

* corrección integral de sincronización, dropdowns y notificaciones ([ea4e026](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ea4e02631b9e7941d55757705b3198425010502d))

### [1.5.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.5.0...v1.5.1) (2026-01-28)

## [1.5.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.4.2...v1.5.0) (2026-01-28)


### Features

* **iglesia:** implementación registro histórico de salidas y roles ([d678174](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d678174ea8af686ebd4c92dace9272ca97b405c4))

### [1.4.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.4.1...v1.4.2) (2026-01-28)


### Bug Fixes

* **backend:** corrección de notificaciones masivas para reuniones; Se ajusta la lógica en meetingController para enviar notificaciones a todos los miembros cuando targetMinistry es 'todos'. ([bce47ca](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/bce47cac27ec7f89414bea06f43cf5738300625f))

### [1.4.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.4.0...v1.4.1) (2026-01-27)


### Bug Fixes

* resolver error 500 al salir de iglesia (rol inválido) ([80adf62](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/80adf627af3b4e61d5853de95df9eb7c7b995a99))

## [1.4.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.3.1...v1.4.0) (2026-01-27)


### Features

* **backend:** Agregar endpoint leave de iglesia, stats globales para dashboard, campo Google Maps en modelo Iglesia y notificación al pastor al salir un miembro ([5769cee](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5769cee8f21d95e2d8d865ed2fd768de9aec223b))

### [1.3.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.3.0...v1.3.1) (2026-01-27)

## [1.3.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.2.0...v1.3.0) (2026-01-26)


### Features

* Implementar gestion completa de eventos de iglesia ([af36b75](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/af36b7534072f91347596fba6b2b48cbb4a3f2e0))

## [1.2.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.1.0...v1.2.0) (2026-01-24)


### Features

* nuevos modelos y controladores para la iglesia ([65149bc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/65149bcd221c65e235a7e97e7a8209841d606e05))

## 1.1.0 (2026-01-24)


### Features

* actualizaciones del sistema de fundación, notificaciones en tiempo real y guías de deployment ([fb1fcc7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fb1fcc7b815003d1b70a368034abc209e400832e))
* Agregar logs detallados para debugging de menciones en comentarios ([7b82d85](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7b82d85de08e03f1e7df7b6ba12fcb2ce98a2595))
* Agregar logs detallados para debugging de obtenerCarpetas ([7186a93](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7186a9318f89c5838bb236cf96e7f3fa5428aac5))
* aumentar límite de archivos de grupo a 100MB para videos ([ccd419b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ccd419b9acb38f3d91ce45b0313b98868525bed3))
* Configuración inicial del backend ([8a1be51](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8a1be51bc8774ddbe7d6ed63bb3a9550ab7c12b4))
* Configuración inicial del backend instalaciones ([1e3af85](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1e3af8581633108ac5ceff3cffab0addaf070916))
* Corregir notificaciones y agregar estadísticas de grupos ([f7f08db](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f7f08dbbc7bde240ba24fb2a8d386c69cc970bea))
* Dividir automáticamente nombres y apellidos en registro ([d3bbd0e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d3bbd0e8689861fe8496e9ddb074f7219d29f788))
* Generar username único en registro para habilitar menciones ([b2a214d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b2a214da4d1e7745b38839f5a6ab1b52b789ec60))
* implement asymmetric blocking logic and unblock endpoint ([723c061](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/723c061666bab430424794be1fafcd4af6be4391))
* implement backend meeting management system with real-time Socket.IO integration ([c9cf2f9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c9cf2f95cdb6dcc73f0f73dc8e63bdd37fb53bad))
* implementacion completa de notificaciones de menciones con soporte legacy y mejoras UX ([a69df12](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a69df12afdb724721866be2d90cb58cd4611a4e4))
* implementada galería de fotos para iglesias (backend) - incluye modelo, rutas y controlador optimizado ([2241d62](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2241d620957fb83142f7d93714c76870874038c4))
* implementar endpoints para archivos y multimedia en grupos ([e0416e5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e0416e5fbe99ddd674da422568d5b403f7d81c3b))
* Implementar index.js principal y configurar scripts ([58d70ea](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/58d70ea6281d299279c2baed1f9bdff91fb9598d))
* Implementar lógica real de acciones de moderación ([b7feca1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b7feca1be9550dd413ea5784f1133acfd02a19fd))
* Implementar reportes de comentarios y perfiles con notificaciones del sistema ([ef9d269](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ef9d2695dd547ea999f02bf5df7297be76d6ef37))
* implementar sistema de favoritos (backend) ([5186e3f](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5186e3fa718c5dd5963ec8a0dcfb7dd4c728bb3f))
* Implementar sistema de posts guardados y estructura modular del proyecto ([f93748b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f93748b9a51e213212581980a3775f84e9dcc9fa))
* implementar sistema de tickets, admin panel y auditoría ([7bba471](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7bba4714ec55d9e4a2c74d1ff835ae6fd82a10d2))
* implementar sistema de username unico en backend ([a746a5b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a746a5beb1f10adee24d90bfd30bd8cc2ed6ab9c))
* integración de Cloudflare R2 para almacenamiento de imágenes ([b4687ec](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b4687ec420594aae9419860baeff3f3ce315ebcb))
* menu de opciones completo y dejar de seguir ([8361def](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8361def2af8590e25c77768196d588728b4a6aa4))
* sistema anti-spam de notificaciones - previene duplicados en likes ([0446390](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0446390b94314cd29c796dce466491dcb54812d7))
* Sistema completo de reportes y moderación Trust & Safety ([b6fe273](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b6fe27325dd2ad9c155a9c4beb9f93b0f85f7d5f))
* Sistema de carpetas con permisos organizacionales + mejoras en mensajería ([7771569](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/77715698b52c79b376f9467dd8787fdee413f71b))
* Sistema de menciones y notificaciones inteligentes ([5edb6ed](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5edb6ed02feecab69f5de07f940e0d610f40a422))
* Sistema de publicidad completo - Edición de campañas y rotación inteligente de anuncios + Fix MissingSchemaError ([033d2cd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/033d2cd6715289183c33aac9cabd43452b09d5c9))


### Bug Fixes

* actualizar adjuntos de chat de grupo para usar R2 y aumentar límite a 50MB ([32a9011](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/32a90110fbe0a4458e99a29d7a0cf0a1c443a14f))
* actualizar imágenes de grupos para usar R2 con memoryStorage ([eea9569](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/eea956994cf25bcae5a72f37bd694ebda7dc5abd))
* Add detailed logging and error handling to iglesias endpoint ([cb17092](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cb1709212433b378f188cad3d7a9d751bfa3a01b))
* Agregar IP de AWS a CORS para permitir WebSockets en producción ([7f1aedf](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7f1aedf78c299c835b1acc312593ac01a7c93d18))
* Agregar tipo 'like_comentario' al enum de notificaciones ([46e15a0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/46e15a0fbec2e2397ab271e5a3791f36f1f9dcf8))
* Agregar updatedAt al select de usuarios suspendidos para fallback de fecha ([46f02ee](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/46f02ee0b02bb1ba41fb357d063ff27b48a08f86))
* Búsqueda de menciones Case-Insensitive y reparación de logs ([ad83338](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ad83338a2b17930e2a70ed55a3b3250fa318e4d9))
* cambiar avatarStorage a memoryStorage para R2 ([8bfa6d0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8bfa6d049f44e7cb15279ecc64f2d5d74c9b41fd))
* Change iglesia route from /api/iglesia to /api/iglesias to match frontend ([6cf5dd2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/6cf5dd240883a38213e5cd08eaa724d34cd47936))
* Change Multer to memoryStorage for direct R2 uploads in iglesia routes ([3e5ba00](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/3e5ba00a36216d9398dbd7639ee439e8d016eafa))
* Corrección de lógica de Usuarios Suspendidos (Nombre, avatar, fechas) ([d2274b2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d2274b291a327f4e9920f0dae33606cbbfb0bd2e))
* Corregir campo post.autor a post.usuario en reportController ([fd256c9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fd256c96cca4679ae75af696d5a2a49110e469c1))
* corregir error 403 en endpoint de ministerios - Eliminada validación duplicada en controlador que causaba error 403 - Actualizado middleware esMiembroIglesia para validar correctamente permisos entre miembros de misma iglesia - Renombradas variables para mayor claridad (solicitante vs targetUser) ([64c94e7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/64c94e75f424706bc5c08c389e339e845263e6fd))
* Corregir error 500 en getReportById y manejo seguro de usuario null ([086b6ab](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/086b6abb94bb69187d59144a0c3824d1baa83cf5))
* Corregir error de sintaxis en User.model.js ([1a553a0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1a553a08ca7d3cfd22499d82dbdb75af3d873c18))
* Corregir generación automática de reportNumber ([df5d978](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/df5d9787bc0e791fb9237cf6e0b8d2cda6cd4269))
* Corregir importacion de Report model usando destructuring ([9fe8352](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/9fe8352601992d8bb9cf8d5156763a3c52eb8c41))
* Corregir nombres de propiedades contentSnapshot para eliminacion correcta ([cb74121](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cb7412124214045aaf39840aede5e45c4e5ad5a4))
* Corregir notificaciones de comentarios en publicaciones ([817ef06](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/817ef0643968936926732c64a9c4f8d6977cbd60))
* Corregir regex de menciones en comentarios para capturar puntos y guiones ([cdf27a0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cdf27a0d1e134ed44d3dd9805c89e349780812b7))
* Corregir require de User a UserV2 en menciones de comentarios ([4fe858d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/4fe858dda4fefae22103cfab1878df4d12e202f9))
* corrige validación de token ([106befd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/106befdf8fbff2c9b0135d71fabd65a2cd29b628))
* Deshabilitar cache en feed y mejorar fallback de socketio ([10177cf](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/10177cffc78633f70a2a27cb6f09807926864abd))
* Emitir notificaciones de sistema via socket para feedback inmediato ([ac643b0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ac643b0912cd4306e50bdcad358ad3e2fb3506ba))
* Endpoint cancelar solicitud y mejoras en gestión de solicitudes ([483e9c4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/483e9c4f030a5d80dd0eb2c65b9b52d6073c9d09))
* Error MODULE_NOT_FOUND en notificaciones de mención ([d241dff](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d241dff1a370c56e637892993479bd87ee3f50e1))
* Filtrar posts privados en feed de grupos ([53e5f38](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/53e5f38add73400c6d8eaefed69e4d5d85b4da06))
* Friend request acceptance 500 error - move response before notifications ([0946588](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/09465883dc6c79aa7613993a40f0895c4d57abab))
* Generar reportNumber en controlador en lugar de middleware ([700e931](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/700e931426a595c2486d8c4e8562c3947c6fa8ab))
* Habilitar autenticación en rutas de carpetas ([6f4fa33](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/6f4fa33dafae685b2b727c05bef0745547582548))
* Menciones en respuestas a comentarios ahora notifican correctamente ([7e97dfe](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7e97dfe94d2e4f467926958a6ea01a529afa7d9a))
* migrar todos los storages restantes (banner, post, message) a memoryStorage para R2 ([1bd248f](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1bd248f6ab242424abb946458c051b95cd0b6a31))
* Notificaciones de sanción y logs de eliminación ([37049cb](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/37049cb683b7b2704087271c07a50c60ce0ae645))
* Populate nombres/apellidos en logs y tickets para nombreCompleto virtual ([5a0a22d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5a0a22d709e177e7d4ce2d7cbe42b50a869f2c8d))
* Robustecer entrega de notificaciones usando sala de usuario automatica ([dd2569c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/dd2569ccb9b9343bddbfd14e14fdbd86cea96afd))
* Robustecer getReportById ante datos nulos en snapshot ([5cdf89f](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5cdf89f244737eab73f104b0ab267d8a47460848))
* Robustecer virtuals de Post.model ante campos no seleccionados ([9807dfc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/9807dfc1e230fff9d86d8f3b557694093aee8d09))
* Socket.IO ahora respeta amistad al emitir posts - solo amigos ven publicaciones en tiempo real ([5f5627c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5f5627ccaba017e5a86a3e59c1372f1bd1544870))
* Update Ad model gender enum to match frontend values (masculino/femenino) ([e67cf8d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e67cf8d60242d7ecae266cf5807a8708ee1605a5))
* Verificacion de borrado y evento socket para eliminacion ([e6b3eb9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e6b3eb966672927b15ac6183c1c107aca64e048f))
