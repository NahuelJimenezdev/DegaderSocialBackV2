# Documentación: Sistema de Recomendaciones (Carrusel)

**Fecha: 2025**
**Versión: 1.0.0**

**Fecha:** 20 de Abril, 2026
**Versión:** 1.0.1 (Revisión de vigencia — Sin cambios funcionales)
**Estado:** ✅ VIGENTE — Reglas OBLIGATORIAS

---

> [!CAUTION]
> ### 🚨 REGLAS CRÍTICAS DE RENDIMIENTO
> * **NUNCA** selecciones objetos padre completos (`social: 1`, `personal: 1`). Siempre proyecta campo por campo (`social.fotoPerfil: 1`).
> * **NUNCA** uses `.skip()` para aleatoriedad en colecciones grandes. Usa `.limit()` + Fisher-Yates en memoria.
> * Si el Frontend necesita un campo nuevo en el carrusel, **añádelo individualmente** al diccionario `.select({...})`. No añadas el padre.

---

## 📌 ¿Por qué falla el Carrusel de Recomendaciones? (Troubleshooting)

Si en el futuro se hacen cambios en `src/services/recommendationService.js` y el carrusel deja de mostrar usuarios o se queda cargando (Skeletons) y da un error 500, el motivo más probable es un **Timeout de Red de MongoDB (MongoNetworkTimeoutError)** debido al volumen de datos.

### ⚠️ El Problema Original
La consulta original utilizaba:
```javascript
const randomCandidates = await User.find()
  .select('nombres apellidos social fundacion personal seguridad')
  .lean();
```
Debido a que el modelo `User` en Degader es extremadamente grande e incluye múltiples subdocumentos anidados grandes (como imágenes base64 en `social` o documentos densos en `fundacion` y `personal`), la selección en bloque de esos objetos generaba un documento masivo.
Al pedir esto para 100 o 200 usuarios, MongoDB Atlas (especialmente en su Tier Gratuito M0 o M2) estrangulaba la conexión porque intentaba enviar Gigabytes de información de un solo golpe. La conexión terminaba siendo abortada, el FrontEnd no recibía respuesta y mostraba el mensaje de error.

### ✅ La Solución Implementada (Regla a seguir)
**NUNCA selecciones objetos completos en esta consulta.** Siempre utiliza "Proyección Estricta" (Strict Projection) campo por campo.

```javascript
// FORMA CORRECTA Y OBLIGATORIA
const randomCandidates = await User.find()
  .limit(200)
  .select({
    'nombres.primero': 1,
    'apellidos.primero': 1,
    'social.username': 1,
    'social.fotoPerfil': 1,
    'fundacion.territorio.pais': 1,
    'fundacion.cargo': 1,
    'fundacion.nivel': 1,
    'personal.ubicacion.pais': 1,
    'personal.ubicacion.estado': 1,
    'seguridad.estadoCuenta': 1
  })
  .lean();
```
Al proyectar exactamente los 10 atributos que lee el frontend de React (`UserCarousel.jsx`), reducimos el peso del JSON de varios MBs a apenas ~7 kilobytes de transferencia en red. El tiempo pasó de colgar el sistema entero a responder en `1.4s`.

### 🚨 Segunda Regla: Evitar .skip()
No uses `User.countDocuments()` junto con `User.find().skip(X)` en grandes volúmenes para aleatoriedad, ya que `.skip` obliga a Mongo a "escanear" documentos completos hasta llegar a la meta. Se implementó una selección en memoria rápida usando `.limit(200)` y el algoritmo `Fisher-Yates (Math.random)` para mezclar sin costo de CPU en la base de datos.

Si en el futuro el Frontend requiere campos adicionales (ejemplo: mostrar edad o provincia), **añádelos uno por uno a este diccionario `.select({...})`**. NO añadas los padres (`personal: 1` o `social: 1`), porque arrastrará los binarios guardados y destruirás de nuevo la velocidad del sistema.

---

**Actualizado por:** Antigravity AI
**Referencia de Código:** `src/services/recommendationService.js`
