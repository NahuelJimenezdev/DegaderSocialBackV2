# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.38.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.38.0...v1.38.1) (2026-04-09)


### Bug Fixes

* **fundacion:** corregir nombre de área ejecutiva y actualizar lógica de asignación ([c10670a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c10670a7b69057182d43c7b949a0da5f99741bd3))

## [1.38.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.7...v1.38.0) (2026-04-09)


### Features

* **fundacion:** implementar descarga de base de miembros en Excel con control de jurisdicción ([f272e34](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f272e345313a8d3ab997b7f9bc866e1539038cee))

### [1.37.7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.6...v1.37.7) (2026-04-09)


### Bug Fixes

* **controllers:** harden FHSYL and Entrevista persistence ([be0a256](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/be0a256f7f0b04e0b2b93d5c8d0e93ee57b6c766))

### [1.37.6](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.5...v1.37.6) (2026-04-09)

### [1.37.5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.4...v1.37.5) (2026-04-08)

### [1.37.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.3...v1.37.4) (2026-04-08)


### Bug Fixes

* **userController:** prevent silent data loss in hojaDeVida save ([ae5259f](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ae5259f31393e42ce8cee3e2f61362daeed29654))

### [1.37.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.2...v1.37.3) (2026-04-08)


### Bug Fixes

* **storageHelpers:** fix Sharp producing corrupted PNG for firma uploads ([d54c06e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d54c06e5d3b1610da128d5742a9dd054e7c36d9d))

### [1.37.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.1...v1.37.2) (2026-04-08)

### [1.37.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.37.0...v1.37.1) (2026-04-08)


### Bug Fixes

* **iglesia:** add missing mongoose import to fix 500 error during church creation ([33ebd88](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/33ebd88d70b14a3a513582b9085f6f6afcbb3893))
* **iglesia:** prevent duplicate members + add expulsarMiembro endpoint ([a6438b4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a6438b41b769e35a47b19873a19b7629f5e8f76b))

## [1.37.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.36.0...v1.37.0) (2026-04-08)


### Features

* **fundacion:** se populó el campo referenteId con información detallada de fundación en los listados de solicitudes para permitir visualización completa en el frontend ([2ce09bb](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2ce09bba22e65f1f19e64bf7b7ebf1b6b226a6c3))
* implementation of rich link previews for group chat and backend metadata service ([685023b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/685023b2bf2d7c89bf70bb06cb36e20042ca1c87))
* rich link previews, security hardening, and mobile UI fixes ([07b62ad](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/07b62ad5f92f5a00f648afc01a801c283673a7e5))


### Bug Fixes

* **folders:** increase description limit and make optional to resolve 500 error ([b0b66a8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b0b66a8ddc7e45776ebdba7daa3bfd38a16bcec6))
* **folders:** resolve UTF-8 filename encoding and permission checks ([28ec509](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/28ec509040b30309084429f77945f2bbb2e0d7b1))
* **r2:** prevent double slashes in generated URLs ([37521b1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/37521b1d94daa8d3534a346bc35304c3122ca537))
* upgrading node to version 20 in Dockerfile to fix ReferenceError File is not defined ([00ee121](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/00ee12198c486de4299c261568794981532b8c94))

## [1.36.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.35.0...v1.36.0) (2026-04-02)


### Features

* **backend:** add support for birthday post type and custom metadata ([cfa5926](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cfa5926178a457090ea27f58e4076d6666a9338e))
* **fundacion:** add fechaSolicitud and historialCargos support ([a769ada](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a769ada7f3162a95a91176e76b56ecb182bef08b))
* Implementacion de previsualizacion Pro (Open Graph) para tarjetas de cumpleaños y copia directa de link ([ad8a32e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ad8a32e9e1902c4128dcd7e10412382ec1765e55))
* Implementar cargo Afiliado con doble dimensión (territorial + jerárquica manual via referenteId) ([f67b8b1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f67b8b16acd78bb6907dbaf64597bcf56fc5b557))
* **institutional-roles:** add Sub-Director de Áreas and Secretario/a Sub-Director de Áreas positions ([5939acb](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5939acb1ebe42d09e71284690647218aaa028207))


### Bug Fixes

* Correccion de casting de IDs en FeedService y blindaje de isInfluencer para posts poblados ([b349cbc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b349cbce94bbc9407f7b6f02ee58f5b174d2fb82))
* Correccion de rutas dinamicas y metadatos SEO para compartir ([2b86da2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2b86da2cf57e303a6b787b3d322918da320b86bb))
* Corrigiendo rutas de redireccion de /post/ a /publicacion/ para coincidir con frontend ([148553e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/148553e30d09344d630fefaa7d239fbe6c031edd))
* Error 403 Forbidden al gestionar asistentes y ver detalles de reuniones. Ajustada validación de creador con ID robusto en respondAttendance, getCreatorMeetingDetail y updateMeeting. ([e404d5c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e404d5c6a45b23c8a4274c66a7c01cd341c15dc2))
* Error 500 al solicitar asistencia a reuniones. Corregida obtención de ID de usuario y blindado envío de notificaciones al creador. Sistema de solicitudes ahora es robusto y trazable. ([ec9d78d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ec9d78dd9283d802e795e381e96c234eeecac4bf))
* **fundacion:** sort and select solicitudes by fechaIngreso instead of createdAt ([2a525a8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2a525a8e6c7d1f7e8b922d5e77927c29263c235a))
* Guardar subArea, programa, rolFuncional y referenteId en updateProfile - campos faltantes en el mapeo de fundacion que causaban que nunca se persistieran en MongoDB ([00b17cd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/00b17cddf4a184adc660b0c8bcd30d941f526b1b))
* Notificacion de afiliado va directo al referenteId en vez de escalar al Founder ([0c101f7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0c101f74c2315f7ecd7504902dc7da3ce6657b02))
* Permitir visualizar posts de cumpleaños en el perfil del destinatario ([8bf569a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8bf569a61a10ba6c643ee877f334fa720e3310ab))
* standardized userId extraction and ObjectId comparison in cancelMeeting and joinMeeting ([c346129](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c346129b2c78c7c6b59196c1a75d3d9101dae456))

## [1.35.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.34.0...v1.35.0) (2026-03-29)


### Features

* force add index script ([7b3a337](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7b3a3379d8289eb79cabf5010d1a4f11b8a49836))


### Bug Fixes

* **backend:** add fallback to prevent empty recommendations in small databases where everyone is a friend ([1fe4e90](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1fe4e9031d2ac3cbdf050d84f821f38d074ec176))
* **backend:** replace  aggregation with skip-limit pattern to prevent MongoDB Atlas network timeouts ([786386a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/786386ab5e9f096e173d57071886a97f13a24ab1))
* **dns:** remove stale extra_hosts IPs to resolve connection timeouts against shifting cluster nodes ([d0522af](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d0522aff8b7b2814c41fb706404eac31bd486df0))
* Poblado de usuarios en comentarios y verificacion de menciones ([5ced803](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5ced8038978c8e5eeac119cee92213edbff4dc94))
* **recs:** gracefully handle missing user country and strict security filters ([ef7a207](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ef7a20746302de0c353b1c37f3cc967af4d59c4a))

## [1.34.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.33.1...v1.34.0) (2026-03-29)


### Features

* performance optimization for feed and recommendations ([102fd4d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/102fd4dad29e4a23355c01df41aa7606133aa4b7))


### Bug Fixes

* added extra_hosts to resolve MongoDB Atlas DNS issues in Docker container ([75d8e16](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/75d8e164e7f1694cbfd7dfba48b143b6aeba71a3))
* implemented retroactive feed synchronization (Backfill) and strict Round-Robin author interleaving for feed diversity (Phase 4). | Detail: backfillFriendPosts in feed.service.js, friendshipController.js integration, and author diversity in postController.js ([91095c3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/91095c308573f66d2665c7f454e10dcced7bfbff))
* optimized feed snapshots to include likes array and improved feed merge logic ([7b19b00](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7b19b00d2fcd9fa64a54306b5d8080f951f2bf9d))

### [1.33.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.33.0...v1.33.1) (2026-03-29)

## [1.33.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.32.0...v1.33.0) (2026-03-29)


### Features

* implement hierarchical user recommendation system backend ([38ea22c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/38ea22c022f47a5c02cd29015fab56fd0d6467be))
* Modelo de Backup para registros de base de datos ([2c8af5a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2c8af5a6e767fb6aa08b614a52ed95064d6ae3c2))


### Bug Fixes

* **backend:** corregido path notificationService ([cf22adb](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cf22adb0ae2d88d9e7f04d578ec4efc3d03e6280))

## [1.32.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.31.0...v1.32.0) (2026-03-27)


### Features

* add getUsuarioJurisdiccionDetalle endpoint for on-demand form access ([c9d5d98](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c9d5d9864ab021f0cf2cb213d24d64d3284cccdb))
* **audit:** corrección de bucle de caché híbrida, optimización de login y flexibilización de filtros de fundación ([04a57a2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/04a57a2412e1035f386b6049ec8f2996d7017ee5))
* **auth:** Implementar sistema híbrido JWT + Redis Cache para eliminar cuello de botella de MongoDB ([5c3506c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5c3506c1adabc6da89d7bf3b74e6bb139737a563))
* **fundacion:** Reestructuración jerárquica y territorial ([451aeeb](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/451aeebd69830056bbcd4d5c6c08903fa283b495))
* **infra:** auto-blindaje - auto-sync índices, health check y fallback idempotencia ([ad5ac39](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ad5ac39bbecab61a2d015a83ca830a7f434049c3))
* **infra:** hardening distribuido - liveness, readiness y safe index verification ([fab4ce2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fab4ce27ef0c4b81e0e2a25578d62b7e476d4eda))
* notification action state (accionada/estadoAccion) - prevent double actions + consistent behavior across all controllers ([4ee42b1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/4ee42b11238ea1a49a886ece7d92e2d5bff69e66))


### Bug Fixes

* add app-level retry for login query (handles Atlas M0 timeouts) ([43387a7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/43387a7d4f6c9421fa51da3ee4a2e609c4e9b3be))
* añadir script para forzar creación de índices de usuario ([1b6af84](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1b6af8421351c9e810a8c229597b6666d0fe0fd1))
* audit logs for login + reduced pool size to 10 to prevent Atlas M0 exhaustion ([0407984](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/04079840cf11527b3a26cf0542655ee565ad05a3))
* **auth:** agregar validaciones de seguridad para prevenir crashes (502) ([b8420da](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b8420da2f5f6a7b04dba9c465192f5fddf9b2a5d))
* **auth:** blindar login contra datos corruptos y eliminar logs de debug - Validar password antes de argon2.verify (previene crash) - Eliminar 15+ console.log que exponen headers/tokens - Agregar null-check en changePassword - Usar logger en lugar de console para puntos críticos ([3a8ea38](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/3a8ea38a34540d1fdd849466bc465a65f5b27d18))
* **core:** Purgar COMPLETAMENTE el middleware de métricas en index.js para eliminar ERR_HTTP_HEADERS_SENT ([17360f6](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/17360f6cba935605659a4e6b97fd488fcfe18b16))
* **core:** Remover header de latencia experimental en index.js que causaba ERR_HTTP_HEADERS_SENT y 502 Bad Gateway ([392cbef](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/392cbef46354f6018c874a1e2d80c53d8a671983))
* **db:** desactivar autoIndex para evitar 502 en arranque ([1f378b7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1f378b7556987f203e45e3b07382274b73cc3e24))
* **db:** mejorar resiliencia de conexión y timeouts para evitar 504 Gateway Time-out ([954c382](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/954c3821277a37dc2d58cc88d997fb4a4e2443c8))
* **docker:** agregar extra_hosts para resolución de Atlas dentro del contenedor ([a74c2b1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a74c2b1b32ce60a97bd807d3cc37f2420891b284))
* explicitly set collection name to 'userv2' to match DB ([a58dfab](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a58dfab188b434344f4e9d32e58f326282aa6e77))
* force IPv4 (family:4) and set waitQueueTimeoutMS to resolve VPS-to-Atlas freezes ([6e4d64a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/6e4d64a9ca69ec516a6ea69cd8792ea684d12c81))
* **founder:** Corregido mapeo de campo rol en dashboard y estadísticas ([ec53d94](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ec53d94a2f41abd25e206d6752ecc13eefed2d21))
* **fundacion:** establecer fundacion.activo = true al aprobar solicitud ([18953b3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/18953b32e0f80a7ca833623e8acb51652d9292eb))
* harden MongoDB connection (v2.3) - faster failover, retryReads/retryWrites, 503 on timeouts ([5fe78fd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5fe78fd0a5e808da9640eccb44150cf132f37616))
* **iglesia:** Inyectar invalidación de caché de usuario en operaciones transaccionales (crear, eliminar, transferir). Limpiar referencia legacy de base de datos ([b3a8406](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b3a840671c1d96b1dd7ea6d15c5e0440404d80f3))
* **infra:** remover extra_hosts hardcodes y habilitar dns dinámico de google para mongodb ([79f35b6](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/79f35b65543067cb0a819625e7d403efe058f7cb))
* **middleware:** blindar role guards con optional chaining y permitir Founder - isAdmin: usar ?.rol con fallback a seguridad.rolSistema - isModerator: misma protección + permitir Founder ([be57f61](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/be57f612527fcc73b3934e9c503cc720e8b5b165))
* restaurar campos críticos en perfil, corregir permisos de aprobación e importar Notificación ([99fd432](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/99fd4321bca2f550fb5ca7ff96b7bacd9195b93e))
* restore critical user arrays for UI and fix approval logic + missing notification import ([5e6ba4d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5e6ba4d4804da9b9541954631b7100a3967c273f))
* sanitizar URI en script de arreglo de índices ([f291ec3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f291ec345efc1f7e0c2b3445b7a12464261de55c))
* sanitizar URI en script de diagnóstico ([2b893b2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2b893b2961ed013022cfedf4b00c84e32d1928c1))
* **security:** Actualizar ipKeyGenerator en express-rate-limit para prevenir evasión por IPv6 ([f3c116a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f3c116a731189fad8088932dc8770fa0fe14975d))
* **security:** Aplicar ipKeyGenerator en todos los limitadores (global, distributed y creación) para prevenir evasión IPv6 ([077580b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/077580b6a1343364de309bc4026478c8eca04794))
* stable connection and enable production indexing ([c933364](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c933364ad04a2213e5c6d742a8fff5df6409e5b5))
* syntax error in idempotency middleware (restored try block) ([58d4cb9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/58d4cb9987f298b18cf1c8ddac5eeef29c97f411))
* total Mongoose bypass for login flow - uses direct driver for all queries + argon2 timing logs ([e1fe402](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e1fe40220106734fe2cf9d8c02cd0db938c09ea6))
* visibilidad de jurisdicción y limpieza de MONGODB_URI ([fcbe195](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fcbe19531816b9d43dca3e56c58177a266732a17))

## [1.31.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.30.4...v1.31.0) (2026-03-24)


### Features

* **debug:** add script to check founder tokens ([ebecf5a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ebecf5afd047aec307063e3194fa8a9328b1719c))
* **debug:** add script to check specific user tokens ([914ac76](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/914ac765613bba78a32b6d46f954ed363a345af5))
* **fundacion:** agregar script de diagnóstico para datos de hijos ([8785c13](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8785c1305aada696c3cc93d2d2a011fb705d3986))
* **iglesia:** hardening avanzado - idempotencia, transacciones, error handler global y normalización ([0687bee](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0687beedf7ec6f99110f120320a70ccb2c7c826a))
* **iglesia:** hardening de producción - índices únicos, rate limiting y logging estructurado ([a1f7aba](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a1f7abac29972207183a07434f7171c2cef5be48))
* **messaging:** deep audit fixes, idempotency, extreme pagination, and push notification sync ([814d7b0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/814d7b028ba95a6a4bcd291248fd239b59edda73))
* **messaging:** PWA install button and notification deduplication by deviceId ([865c9c7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/865c9c7479cda073005ee75014582e27e2a6b10b))
* **test:** add bypass script for prerequisite documents ([a588810](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a5888104876ff873f155a2a52d69c70d369a1376))
* **test:** make bypass script accept dynamic email arguments ([790f2c3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/790f2c3e17e0516fa6220a7c45f39d923afbda76))
* **test:** revert bypass script to manual array management ([417c5ba](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/417c5ba24dcca828f5b138e15ee27acbb07f8ad2))


### Bug Fixes

* **debug:** add extra logs to userController for enrollment tracing ([e8a26da](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e8a26da52ec4bb9eb9ac6ccb92b760092bc9eed6))
* **debug:** add verbose logs to notification service entry points ([456f3e9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/456f3e951f8a6eeaafb2f8209252f8914967a674))
* **debug:** fix relative paths in check-user-tokens script ([0a34aea](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0a34aea06f9fc0cb068d96d155e26a87ce3c256a))
* **deploy:** update docker-compose to pass Firebase build args to frontend ([58818db](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/58818db54b78cbbc210a642992b5ed2b9979fbd1))
* **fundacion:** fix founders undefined error and improve enrollment notifications ([d3cc9da](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d3cc9dab2c21333866e0b21ffc65c03136508c01))
* **fundacion:** fix TypeError on missing area and enable Push notifications in utility ([250f911](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/250f91126787d04faed52ba3659ae66ef9994824))
* **fundacion:** restore missing query filter and enhance debug logging ([05b3860](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/05b3860cb0a6777edc850a3cbe291d6a0d5af8d8))
* **iglesia:** corregir duplicación de iglesias, añadir validaciones de backend y cleanup scripts ([7f29c63](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7f29c63b95170443de65a8141f1266ec8b5d3d9f))
* **messaging:** bypass idempotency for foundation per-retry and add dynamic deep-linking ([a1dbdfd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a1dbdfdb56841c698377d346182bcd28c0121c4e))
* **messaging:** disable bell notification for messages and add verbose FCM logs ([75d7ecd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/75d7ecdd45b9f49d4433ec4d25fc297d4ab531eb))
* **messaging:** remove outdated mensajes field access in getOrCreateConversation to fix 500 error ([ddf4783](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ddf4783e8df5bbc325579b2f7f52a11094f7213b))
* **messaging:** restore clean utility and keep idempotency/deep-link fixes ([0030917](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/00309177edc5d04eac279f0c22e906808cfd7dea))
* move mongoose to top level to resolve IDE warnings ([ecdd7a4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ecdd7a432d86956cbd75962311c02f3ace837d66))
* **push:** avoid top-level mongoose require to resolve IDE error ([2840084](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/28400843f92c3063de09a27700c673b698f44f1d))
* **push:** emergency diagnostic logs and data audit scripts ([e185bd3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e185bd36521aaa849c8663a174ff5b85c196ec7b))
* **push:** ensure userId is ObjectId for token query and add more logs ([21aa8e2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/21aa8e2038e33dd2f3b15b1bff7e966877e94aef))
* **push:** optimize FCM payload for Web and add foreground logging ([64b6dcc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/64b6dccf9a7633dceb2b251e450601228806289b))
* **test:** use updateOne to bypass Mongoose validation in test script ([a661694](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a66169485993999c81b3cae69b123af8762999fb))

## [1.30.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.30.4...v1.30.0) (2026-03-24)


### Features

* **debug:** add script to check founder tokens ([ebecf5a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ebecf5afd047aec307063e3194fa8a9328b1719c))
* **debug:** add script to check specific user tokens ([914ac76](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/914ac765613bba78a32b6d46f954ed363a345af5))
* **fundacion:** agregar script de diagnóstico para datos de hijos ([8785c13](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8785c1305aada696c3cc93d2d2a011fb705d3986))
* **messaging:** deep audit fixes, idempotency, extreme pagination, and push notification sync ([814d7b0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/814d7b028ba95a6a4bcd291248fd239b59edda73))
* **messaging:** PWA install button and notification deduplication by deviceId ([865c9c7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/865c9c7479cda073005ee75014582e27e2a6b10b))
* **test:** add bypass script for prerequisite documents ([a588810](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a5888104876ff873f155a2a52d69c70d369a1376))
* **test:** make bypass script accept dynamic email arguments ([790f2c3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/790f2c3e17e0516fa6220a7c45f39d923afbda76))
* **test:** revert bypass script to manual array management ([417c5ba](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/417c5ba24dcca828f5b138e15ee27acbb07f8ad2))


### Bug Fixes

* **debug:** add extra logs to userController for enrollment tracing ([e8a26da](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e8a26da52ec4bb9eb9ac6ccb92b760092bc9eed6))
* **debug:** add verbose logs to notification service entry points ([456f3e9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/456f3e951f8a6eeaafb2f8209252f8914967a674))
* **debug:** fix relative paths in check-user-tokens script ([0a34aea](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0a34aea06f9fc0cb068d96d155e26a87ce3c256a))
* **deploy:** update docker-compose to pass Firebase build args to frontend ([58818db](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/58818db54b78cbbc210a642992b5ed2b9979fbd1))
* **fundacion:** fix founders undefined error and improve enrollment notifications ([d3cc9da](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d3cc9dab2c21333866e0b21ffc65c03136508c01))
* **fundacion:** fix TypeError on missing area and enable Push notifications in utility ([250f911](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/250f91126787d04faed52ba3659ae66ef9994824))
* **fundacion:** restore missing query filter and enhance debug logging ([05b3860](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/05b3860cb0a6777edc850a3cbe291d6a0d5af8d8))
* **iglesia:** corregir duplicación de iglesias, añadir validaciones de backend y cleanup scripts ([7f29c63](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7f29c63b95170443de65a8141f1266ec8b5d3d9f))
* **messaging:** bypass idempotency for foundation per-retry and add dynamic deep-linking ([a1dbdfd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a1dbdfdb56841c698377d346182bcd28c0121c4e))
* **messaging:** disable bell notification for messages and add verbose FCM logs ([75d7ecd](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/75d7ecdd45b9f49d4433ec4d25fc297d4ab531eb))
* **messaging:** remove outdated mensajes field access in getOrCreateConversation to fix 500 error ([ddf4783](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ddf4783e8df5bbc325579b2f7f52a11094f7213b))
* **messaging:** restore clean utility and keep idempotency/deep-link fixes ([0030917](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/00309177edc5d04eac279f0c22e906808cfd7dea))
* move mongoose to top level to resolve IDE warnings ([ecdd7a4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/ecdd7a432d86956cbd75962311c02f3ace837d66))
* **push:** avoid top-level mongoose require to resolve IDE error ([2840084](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/28400843f92c3063de09a27700c673b698f44f1d))
* **push:** emergency diagnostic logs and data audit scripts ([e185bd3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e185bd36521aaa849c8663a174ff5b85c196ec7b))
* **push:** ensure userId is ObjectId for token query and add more logs ([21aa8e2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/21aa8e2038e33dd2f3b15b1bff7e966877e94aef))
* **push:** optimize FCM payload for Web and add foreground logging ([64b6dcc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/64b6dccf9a7633dceb2b251e450601228806289b))
* **test:** use updateOne to bypass Mongoose validation in test script ([a661694](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a66169485993999c81b3cae69b123af8762999fb))

### [1.29.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.29.2...v1.29.3) (2026-03-21)

### [1.29.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.29.1...v1.29.2) (2026-03-20)

### [1.29.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.29.0...v1.29.1) (2026-03-20)


### Bug Fixes

* persistencia robusta de mapas Mongoose con .set() y markModified ([cfa361d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cfa361d2395f872850e9bbeb2aeee1d472b1c204))
* serialización de mapas con flattenMaps y markModified granular ([4ec767e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/4ec767e69d948383088b6c1c01ea1668fa8c7c6d))

## [1.29.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.28.3...v1.29.0) (2026-03-19)


### Features

* endpoint para persistencia de Hoja de Vida ([8b17235](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8b172355bf1a6b245bbe36f695242366973e6643))
* proxy de imágenes para evitar CORS en Word ([8e45cb2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8e45cb2e0e24b383dec7bf7a54f9bfda6ebb03a6))


### Bug Fixes

* asegurar persistencia de Map fundacion con markModified ([a0030ec](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a0030ec3a18b8a7e6ad8da01dfe3023080d59c6b))
* registro de ruta /hojaDeVida en user.routes.js ([c871dc0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c871dc0b326fbc5df19d774532b3351b5c3443fa))

### [1.28.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.28.2...v1.28.3) (2026-03-17)

### [1.28.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.28.1...v1.28.2) (2026-03-17)

### [1.28.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.28.0...v1.28.1) (2026-03-17)


### Bug Fixes

* **fundacion:** manejar correctamente escenarios donde el propio director regional no tiene definida una region string literal en su base de datos ([cd884bc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cd884bcfb767a770920c3b39051443011896c0d3))
* **fundacion:** recuperar propiedades nivel, territorio y area desde director.fundacion en el dashboard admin para usuarios no-founder ([64893a5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/64893a50524f3ec6545406b273c832523f2d2321))

## [1.28.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.27.0...v1.28.0) (2026-03-17)


### Features

* **fundacion:** remodelación del organigrama jerárquico y lógica de ubicación dinámica FHISYL vs Nacional ([0b5f136](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0b5f136410f68d015d0c29fc730a32a58e7a3af9))


### Bug Fixes

* **fundacion:** aplicar strict filtering en listado adminsitrativo para evitar escalada de visualizacion transversal (areas) y vertical (niveles prohibidos) ([1741b95](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1741b959bfe8a52d6942822105998d37371b2e6b))
* **fundacion:** flexibilizar busqueda regional y de notificaciones permitiendo asociar niveles departamentales que omitieron la region literal ([800ab41](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/800ab41db683b219e1da68db9bea6add1e037fe6))
* **fundacion:** sincronizacion de roles directivos, validaciones de area y alertas jerarquicas ([747d7db](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/747d7db402cdf19fbc208890aeec0c15faa0f990))

## [1.27.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.6...v1.27.0) (2026-03-14)


### Features

* Actualizado correo del founder a founderdegader@degadersocial.com en middlewares y controladores ([db1e93c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/db1e93c5f6fb9186e8166fe09f1f9727b35b7a93))
* Implementado sistema de correos de bienvenida con nodemailer ([5674d6d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5674d6d84dbc2d5b50e4f7f55353c3a6f37bd523))


### Bug Fixes

* Añadido .trim() y logs de depuración para asegurar detección de founder en registro y login ([191977b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/191977bd586f412410f1033b99b04ceac2372226))
* Arreglado permisos de banner para Founder y corregido borrado en R2 ([e2caf1c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e2caf1c7981c1755b545d16ec3914e0b6ad06dd9))

### [1.26.6](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.5...v1.26.6) (2026-03-13)


### Bug Fixes

* Sincronización de datos personales (dirección, barrio, celular) al guardar documentación FHSYL ([164f3a0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/164f3a083ab3f8f47d19ba56f49977732a972326))

### [1.26.5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.4...v1.26.5) (2026-03-13)


### Bug Fixes

* Corregido Error 500 al guardar documentación (desactivado activo por defecto) ([b898abc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/b898abcb191c93c5e4cedebe166cae72a6ec3541))

### [1.26.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.3...v1.26.4) (2026-03-12)

### [1.26.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.2...v1.26.3) (2026-03-12)

### [1.26.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.1...v1.26.2) (2026-03-12)

### [1.26.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.26.0...v1.26.1) (2026-03-12)

## [1.26.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.25.1...v1.26.0) (2026-03-11)


### Features

* **fundacion:** schema y ruta para documentacion FHSYL ([dde060b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/dde060b11814dd66b26f787df5c1c25c1f949d90))

### [1.25.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.25.0...v1.25.1) (2026-03-11)


### Bug Fixes

* **iglesia:** evitar null en galeria al resolver imagen ([9df931b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/9df931bf23283ae92e6b0bc876dcf2f2cf51236e))

## [1.25.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.24.1...v1.25.0) (2026-03-11)


### Features

* **fundacion:** agregar subdirector y areas ejecutivas transversales ([f382596](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f382596e61b12e894c6db262b621ccec666a877e))

### [1.24.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.24.0...v1.24.1) (2026-03-11)


### Bug Fixes

* **carpetas:** permitir el acceso a miembros de un grupo ([1f86809](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1f86809f23afc070903e6a3d9a34b1c0cb906e04))

## [1.24.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.23.3...v1.24.0) (2026-03-10)


### Features

* **carpetas:** soporte grupal en schema y controlador ([7971c2b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7971c2b4c1c6385ed827666fb930cd0b18313868))

### [1.23.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.23.2...v1.23.3) (2026-03-10)


### Bug Fixes

* **reuniones:** resolver error 500 al obtener mis reuniones ([68bf614](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/68bf614756bd3e158f96f28ae036c289d56d64f6))

### [1.23.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.23.1...v1.23.2) (2026-03-10)

### [1.23.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.23.0...v1.23.1) (2026-03-10)

## [1.23.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.8...v1.23.0) (2026-03-09)


### Features

* agregar cargo de secretario/a con lógica de género y cargos en niveles local/barrial ([70bd41e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/70bd41e4c0a7e0159e6391c8133c80c78841d37c))

### [1.22.8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.7...v1.22.8) (2026-03-03)


### Bug Fixes

* **models:** permitir ligas legado en enum de arena.league para evitar error de validacion 500 ([4c0473b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/4c0473b117e2fa770a8b672613528a06eae0a269))
* **workers:** add error listeners to bullmq queue and worker to prevent Node crashes on redis connection failure ([f76fabc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/f76fabcd91dcb1307e6a42067f7e43ba7f12eefa))

### [1.22.7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.6...v1.22.7) (2026-03-03)


### Bug Fixes

* corregir error 500 en aprobación de fundación y habilitar bypass para Founder ([5c5d686](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5c5d686f70a7b9485a30101e541e3001c3903c2a))
* corregir sintaxis ESM a CommonJS en plan.config.js ([5e82904](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/5e8290497962a5387a783c41ac494056adb5c5bf))
* **fundacion:** prevenir error 500 al aprobar solicitudes si founder no tiene cargo asignado ([cc94350](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cc943508bccc917930212dee88e24daf31794848))

### [1.22.6](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.5...v1.22.6) (2026-03-03)


### Bug Fixes

* corregir error 500 al asignar cargos de ministerio y añadir enums de notificaciones faltantes ([d1de225](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d1de225e469c624864c54289fb6f8d99a78edf3f))
* permitir a Founder aprobar solicitudes de fundación y corrección de error 500 ([1e2e9bc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/1e2e9bcdff448c28bf82087096efdb428b3bfe52))

### [1.22.5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.4...v1.22.5) (2026-03-02)


### Bug Fixes

* **arena:** avoid unrelated validation errors on user save by using validateModifiedOnly ([cd2a413](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/cd2a41302885802e380a7ac52af1669a62496083))

### [1.22.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.3...v1.22.4) (2026-03-02)

### [1.22.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.2...v1.22.3) (2026-03-02)

### [1.22.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.1...v1.22.2) (2026-03-02)

### [1.22.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.22.0...v1.22.1) (2026-03-02)

## [1.22.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.21.0...v1.22.0) (2026-03-02)


### Features

* **perfil:** agregar paginas de configuracion y privacidad de cuenta ([93e536f](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/93e536f9115c518c5065208b1c855f51a8929415))

## [1.21.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.20.1...v1.21.0) (2026-03-02)


### Features

* **iglesia:** agregar opciones de eliminar y transferir administracion ([0d129f9](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/0d129f9d06a7f16e79a30b1704061712650293ce))
* **reuniones:** rediseno sistema con tipos Publica/Capacitacion/Grupal, flujo de asistencia con aprobacion, modal de gestion del creador y fix de notificaciones fantasma ([165341e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/165341e4b936fdbcf6c596feda2cc36ed1604994))

### [1.20.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.20.0...v1.20.1) (2026-03-02)


### Bug Fixes

* corregir importación de middleware en upload.routes que causaba crash del servidor (502) ([e53a37f](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e53a37fbb16e71ad883d1eb725a2b76f2ce4e4db))

## [1.20.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.19.3...v1.20.0) (2026-03-01)


### Features

* implementar sistema progresivo de imagenes ([de0853b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/de0853b115688ea05faac68264109353a4d5744b))

### [1.19.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.19.2...v1.19.3) (2026-03-01)

### [1.19.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.19.1...v1.19.2) (2026-03-01)

## [1.19.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.18.2...v1.19.0) (2026-02-28)


### Features

* **arena:** implementar variedad de desafíos y seeder masivo ([57f54a3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/57f54a37153fd62af1720d5ef2d295b5904d3145))

### [1.18.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.18.1...v1.18.2) (2026-02-28)

### [1.18.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.18.0...v1.18.1) (2026-02-27)


### Bug Fixes

* añadida verificación de logros en getMyStatus para desbloqueo retroactivo ([e298313](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e2983134493ecd1d8370a8c6e40de3cd8c114092))

## [1.18.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.17.13...v1.18.0) (2026-02-27)


### Features

* expandida lógica de logros en el backend para soportar nuevas categorías (XP, rachas, velocidad, consistencia) ([627266b](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/627266b3374d9fb2d545b6bb7fd3d1355e1d6096))

### [1.17.13](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.17.12...v1.17.13) (2026-02-27)

## [1.16.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.15.0...v1.16.0) (2026-02-25)


### Features

* **arena:** ranking jerárquico, anti-farming y persistencia robusta ([35f92cc](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/35f92cc2175e97c46a1f9ca3c4463a3fd872e65d))

## [1.15.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.14.0...v1.15.0) (2026-02-05)


### Features

* feed global para staff y founder ([2c55ab3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2c55ab3d566a3cc0724084ce05b1d2a933c7356f))

## [1.14.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.7...v1.14.0) (2026-02-05)


### Features

* agregar sistema de onboarding con persistencia en backend ([a95f641](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a95f641dda0ef353a36cc1bdb4d3b363f0326b67))

### [1.13.7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.6...v1.13.7) (2026-02-05)


### Bug Fixes

* se agrega un diseño de alert como ios ([8ffb18e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8ffb18e68bf41b15f92c6bfbe726d7fc6885ef9a))

### [1.13.6](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.5...v1.13.6) (2026-02-04)


### Bug Fixes

* **postController:** agregar chequeos defensivos para miembros y creador de grupo ([2ce5071](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2ce5071180944f111cfe75659d99d9e408529567))

### [1.13.5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.4...v1.13.5) (2026-02-04)


### Bug Fixes

* **grupos:** agregar nombre del grupo en notificación de mensaje ([6069147](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/606914741864edde699cedd52ea3df779baedfa0))

### [1.13.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.3...v1.13.4) (2026-02-04)


### Bug Fixes

* **notificaciones:** agregar tipo mensaje_grupo al enum de notificaciones ([18d2619](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/18d2619aa6271b88320dc1fe9c5b607b9c724dd9))

### [1.13.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.2...v1.13.3) (2026-02-04)

### [1.13.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.1...v1.13.2) (2026-02-04)


### Bug Fixes

* **amistad:** agregar sincronización de User.amigos en ruta legacy /api/amistades/aceptar ([2b276e8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/2b276e8004e33a5a808a2938cbdbd99b54badc6e))

### [1.13.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.13.0...v1.13.1) (2026-02-04)


### Bug Fixes

* **socket:** agregar verificación null-safe para notification.contenido ([576be4c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/576be4c7684fc36e8f293e1e73b53effa502308a))

## [1.13.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.12.4...v1.13.0) (2026-02-04)


### Features

* **favoritos:** agregar contador calculado de amigos en respuesta del backend ([750a55e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/750a55ec990f86abe67c5b729bda39252aab7df4))

### [1.12.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.12.3...v1.12.4) (2026-02-04)

### [1.12.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.12.2...v1.12.3) (2026-02-04)

### [1.12.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.12.1...v1.12.2) (2026-02-04)


### Bug Fixes

* **friendships:** safe removal with try-catch and debug logs ([a583397](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/a58339758f22c7ba6edcdf2f3694cae2a116cd5e))

### [1.12.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.12.0...v1.12.1) (2026-02-04)


### Bug Fixes

* **favorites:** popular lista de amigos y stats en favoritos para mostrar contador correcto ([fde2d50](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fde2d50a50b6efd5a6f20f76ca427126578417c8))

## [1.12.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.11.3...v1.12.0) (2026-02-04)


### Features

* **user:** popular datos de iglesia en perfil publico de usuario ([692fd26](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/692fd26c803894facb244b10c69ee5ab8068d71a))

### [1.11.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.11.2...v1.11.3) (2026-02-04)


### Bug Fixes

* **chat:** vaciar historial al eliminar chat y filtrar mensajes antiguos al reabrir ([e592e56](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e592e56064bf9a726c4498fc5db6acf7116b9c12))

### [1.11.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.11.1...v1.11.2) (2026-02-04)


### Bug Fixes

* **chat:** reactivar conversacion eliminada al recibir nuevo mensaje ([20282b8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/20282b80fe09f100d5993088c661515d613fd3c3))

### [1.11.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.11.0...v1.11.1) (2026-02-04)

## [1.11.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.10.5...v1.11.0) (2026-02-04)


### Features

* implementación de transferencia de propiedad en grupos y validación al eliminar ([c5eb5c8](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c5eb5c87d20c40c8ee952bf6fba6361d6ea93013))

### [1.10.5](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.10.4...v1.10.5) (2026-02-04)


### Bug Fixes

* **chat:** enviar cantidad REAL de mensajes leidos para corregir contador global ([366d5c3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/366d5c35ad80f124a5cc34f7050406e78eaaf63f))

### [1.10.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.10.3...v1.10.4) (2026-02-04)

### [1.10.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.10.2...v1.10.3) (2026-02-04)


### Bug Fixes

* **chat:** emitir conversationRead al lector para actualizar contador de notificaciones global ([8afbc70](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/8afbc701c5fa18e95d0d447c6d41e89c7f698c4b))

### [1.10.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.10.1...v1.10.2) (2026-02-04)


### Bug Fixes

* **chat:** emitir eventos globales a participantes y permitir arrays en emitMessage ([d5f3d67](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/d5f3d67e4d469e1650393f75db1a804078d61ca4))

### [1.10.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.10.0...v1.10.1) (2026-02-04)


### Bug Fixes

* **chat:** actualizar estado de mensaje en modelo y agregar logs de socket para debug ([3a9f99c](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/3a9f99c5a6df857ffe664829b8d5c9b2b7cfa81b))

## [1.10.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.9.4...v1.10.0) (2026-02-04)


### Features

* **chat:** agregar indicador de escritura y estados de mensaje (enviado/entregado/leido) ([adc2f38](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/adc2f388464af62b54071673b91f07d0e644fcf3))

### [1.9.4](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.9.3...v1.9.4) (2026-02-04)


### Bug Fixes

* **fundacion:** aplicar Smart Area Matching en permisos de aprobación/rechazo para permitir verticalidad ([acedfb3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/acedfb31a1970c7892dbbc1f0d7a4ce971122735))

### [1.9.3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.9.2...v1.9.3) (2026-02-04)


### Bug Fixes

* **fundacion:** aplicar filtro de área inteligente en utilitario de notificaciones para actualizaciones de perfil ([de8347d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/de8347db8b010a3f08cead0d7d8e4dce124dd595))

### [1.9.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.9.1...v1.9.2) (2026-02-04)


### Bug Fixes

* **fundacion:** implementar búsqueda inteligente de áreas (ignorar prefijos burocráticos) para notificaciones verticales ([fc1bf0e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fc1bf0ef9ec9220d48aabb1f8d368d450f12adb7))

### [1.9.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.9.0...v1.9.1) (2026-02-03)


### Bug Fixes

* **fundacion:** corregir escalada de notificaciones por área y arreglar error de mayúsculas en niveles ([e2d2b9d](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/e2d2b9d43fefd5d8b66673914db1ba3b3f831f32))

## [1.9.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.8.0...v1.9.0) (2026-02-03)


### Features

* **fundacion:** agregar soporte para sub-áreas y programas en solicitudes de fundación ([7dbf3a7](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/7dbf3a766e195fcb25ceeee73910b893350cfd7c))

## [1.8.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.7.1...v1.8.0) (2026-02-03)


### Features

* **auth:** add gender, country, and city fields to registration ([fe3ea2a](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/fe3ea2ad8580dcb1bfe545fbf2ab12c6ac25afe8))

### [1.7.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.7.0...v1.7.1) (2026-02-02)


### Bug Fixes

* auto-reparación de cuenta Founder al iniciar sesión ([c47dc8e](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/c47dc8e13eedf8ef44bc2801b9695ca2fe65c4b9))

## [1.7.0](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.6.2...v1.7.0) (2026-02-02)


### Features

* eliminación automática de imágenes de R2 al borrar registros de MongoDB ([16e45c3](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/16e45c326c0d4f41d5c4d20dc74b9bdb8a714145))

### [1.6.2](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.6.1...v1.6.2) (2026-01-31)


### Bug Fixes

* habilitar gestión de solicitudes para Founder y corregir enums ([3b48f25](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/commit/3b48f25d1868f77e03b12ea6e912652e78c24fbb))

### [1.6.1](https://github.com/NahuelJimenezdev/DegaderSocialBackV2/compare/v1.6.0...v1.6.1) (2026-01-30)

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
