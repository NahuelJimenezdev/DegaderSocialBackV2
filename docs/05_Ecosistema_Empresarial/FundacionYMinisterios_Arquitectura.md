# 🏛️ Fundación y Organigrama - Guía Definitiva de Arquitectura

Bienvenido al manual más completo y sencillo sobre el **Módulo de Fundación y Ministerios** de DegaderSocial V2. 
Si acabas de llegar al proyecto o si tienes 12 años y quieres entender cómo funciona este monstruo de código... ¡Estás en el lugar correcto! 🚀

---

## 1. 🧩 ¿Qué hace este módulo?
DegaderSocial no es solo un Facebook cristiano. Es una **herramienta administrativa gigante** para la *Fundación Humanitaria Sol y Luna*. 
Permite que las personas soliciten ser desde **Afiliados locales** hasta **Directores Internacionales**.

### Los 3 Pilares del Módulo:
1. **La Jerarquía (El Ascensor):** Un sistema multinivel (desde barrial hasta directivo general).
2. **El Padrinazgo (Referidores):** Los "Afiliados" nuevos no le piden permiso al Director General, le piden permiso a un supervisor local a través de un ID.
3. **El Papelerío (Los Formularios):** Tres grandísimos formularios que los usuarios deben rellenar para avanzar:
   - **FHSYL** (Documentación de la Aplicación Institucional)
   - **Entrevista** (Formulario Teológico y Personal)
   - **Hoja de Vida** (Currículum Vitae)

---

## 2. 🗂️ El "Papelerío": Formularios Dinámicos

Este es uno de los logros arquitectónicos más grandes del sistema. Los usuarios suben fotos de sus DNIs, firmas, y rellenan decenas de campos. Una estructura fija destruiría o desaprovecharía una base de datos estricta. ¿Cómo lo resolvimos?

### A. La Intercepción Mágica (Cloudflare R2)
Cuando un usuario guarda un formulario (`Hoja de Vida` o `Entrevista`), el frontend envía un JSON gigantesco. Si ese JSON trae una imagen (`data:image/base64...`), el **Backend la intercepta antes de guardarla en Mongo**.

**Ruta secreta:** `src/utils/storageHelpers.js` (Función `processFormImages`)
1. El backend detecta el texto Base64 infinito (la foto).
2. Lo extrae del JSON.
3. Lo sube de forma silenciosa e hiper-rápida a nuestro almacenamiento en la nube rápido (Cloudflare R2).
4. Reemplaza el texto pesado de código por un simple y ligero link web: `https://.../firma.png`.
5. ¡Recibe la Base de Datos sumamente aliviada!

### B. Los 3 Controladores de Guardado
Todos viven en el archivo **`src/controllers/userController.js`** (Para que un 12-year-old entienda: ¡Los datos de la fundación se guardan dentro del control del Usuario general, no por separado!).

#### 📝 Formulario 1: FHSYL (Actualizar Documentación FHSYL)
- **Endpoint:** `PUT /api/usuarios/documentacionFHSYL`
- **Guarda en:** `user.fundacion.documentacionFHSYL` (Objeto directo).
- **¿Cuándo la UI sabe que terminó?:** Cuando el usuario llenó `testimonioConversion`, `llamadoPastoral`, `ocupacion` y `estadoCivil`. Si completa al menos 3 de los 4 básicos, el estado `...completado` pasa a **true** e ilumina de verde el panel.

#### 📝 Formulario 2: Entrevista
- **Endpoint:** `PUT /api/usuarios/entrevistaFundacion`
- **Guarda en:** `user.fundacion.entrevista.respuestas`
- **TIPO DE DATO (¡CRÍTICO!):** Es un `Map()` mágico de MongoDB. No es un objeto normal y aburrido. Por eso el backend usa una función especial llamada `.set('campo', valor)` en la Línea 838 de `userController`.
- **¿Cuándo termina?:** Cuando llega al **80%** de rellenar los 11 campos obligatorios (nombre, llamado, disponibilidad de tiempo, talentos, etc).

#### 📝 Formulario 3: Hoja de Vida (CV)
- **Endpoint:** `PUT /api/usuarios/hojaDeVida`
- **Guarda en:** `user.fundacion.hojaDeVida.datos` (También es un diccionario `Map()`).
- **¿Cuándo termina?:** Si completa el **75%** de los campos vitales (Documento, nacionalidad, dirección, email, etc).

---

## 3. 🧗‍♂️ El Sistema de Solicitudes (Cómo entrar a las Ligas Mayores)

¿Cómo un usuario en México pide ser "Director de Salud"? Está programado en `src/controllers/fundacionController.js` (Función clave: `solicitarUnirse`).

### Paso 1: El Envío
El UI del usuario dispara un misil a `POST /api/fundacion/solicitar` anunciando la triada sagrada de poder: **Nivel, Área y Cargo**.
*(Ejemplo→ Nivel: Departamental | Área: Dirección de Salud | Cargo: Jefe Médico).*

### Paso 2: La Bifurcación del Referidor (Afiliado vs Directivo)
Existen dos caminos para mandar esta notificación:
1. **El Atajo del Padrino (Para Afiliados):** Si el usuario solicita unirse al nivel más bajo llamado "Afiliado" y en su formulario ingresó el `referenteId` (El código/ID de su invitador), el backend **solo** notifica a esa persona directamente en el acto y termina el trabajo en 2 líneas de código.
2. **El Camino de Escalada (Los ascensos regulares):** El Backend abre un "loop" de búsqueda para averiguar quién tiene un cargo superior sobre la Región que solicitaste usando un sistema de Regulares Expresiones (`Regex`). Compara que la raíz de tu "Área" cuadre con el de arriba. Inserta una notificación de campanita en sus cuentas para que te descubran y evalúen.

### Paso 3: La Plegaria (Aprobación Real)
El líder entra a su PC, ve tu Solicitud en la pantalla y da click. Esa simple acción muta el estado `fundacion.estadoAprobacion` de `'pendiente'` a `'aprobado'`, liberándote acceso a pestañas ocultas que antes estaban bloqueadas.

---

## 4. ⛪ El Sistema de Ministerios (Los Roles Internos de la Iglesia)

No confundir "Fundación" (La ONG a nivel país/globo) con "La Iglesia local". El Ministerio es qué puesto ocupas en *la parroquia de tu esquina.*

### ¿Dónde viven esos datos?
- En el archivo `src/models/User.model.js` en la subsección `eclesiastico`.
- Poseemos dos menús rígidos aprobados por la jerarquía:
  - `ROLES_MINISTERIALES` (Ser pastor de jóvenes, diácono, líder, etc).
  - `MINISTERIOS` (El Ministerio de música, de seguridad, cafetería, danza).

### El Poder de Asignar (Frontend + Backend)
1. **Regla de Oro:** Solamente un usuario que posea el rol de `"pastor_principal"` o excepcionalmente `"adminIglesia"` desbloquea el panel que permite manejar esto.
2. Desde la App se envía a la ruta `src/controllers/ministerioController.js`.
3. Esos controladores *le inyectan* el rol o ministerio al array del perfil del usuario `user.eclesiastico.ministerios` actualizando sus "Placas y Medallas" visibles públicamente ante toda la red social.

---

## 5. 🚨 Botiquín de Primeros Auxilios Técnicos (Troubleshooting)

¿Algo dejó de funcionar y no sabes por qué? Tu salvavidas:

1. ❌ **"El usuario dio click en guardar su Hoja de Vida, todo pareció correcto pero recarga y ¡Están los campos vacíos de vuelta!"**
   - **La Cura:** Como te enseñé, los campos de Entrevista/HojaDeVida viven en un arreglo especial `Map()`. MongoDB es sordo y si tú solo le inyectas valores rápidos no se da cuenta. Tienes que "Gritarle" y forzar un `user.markModified('fundacion.hojaDeVida.datos')`. Si te falla, alguien borró esa palabra clave del `userController.js`.
2. ❌ **"Se colapsó la web al intentar guardar el formulario. El Network de Google marca error rojo gigantesco"**
   - **La Cura:** Cloudflare R2 puede estar congestionado. Adicionalmente los formularios empujan fotos directamente convertidas a Base64. Si es una foto de Ultra HD de 15 Megabytes, el texto Base64 reventará la memoria RAM del servidor Express. Solución: Ir al front y asegurarse que comprime las imágenes a menos calidad nativamente antes de hacer el envío al API.
3. ❌ **"Nadie recibe la campanita de Solicitud enviada de Fundación"**
   - **La Cura:** Revisa la línea 150 del `fundacionController.js`. El sistema tiene una ***REGLA DE ORO DE BLOQUEOS***. Solamente le llega la notificación a alguien de arriba que tenga EL MISMO PAÍS o si es un director en la nube internacional. Si tu usuario pidió estar en 'México' y arriba suyo el Regional está anotado en 'Perú', la plataforma corta la comunicación para que líderes ajenos al país no puedan moderar personas de otro Estado (Naturaleza geopolitica del sistema).

¡Cuida muchísimo este módulo y este archivo, te resolverá la vida a la hora de guiar a nuevos desarrolladores hacia tu ecosistema!
