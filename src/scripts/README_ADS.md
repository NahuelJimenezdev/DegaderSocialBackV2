# Scripts del Sistema de Publicidad

Este directorio contiene scripts útiles para gestionar el sistema de publicidad.

## 📝 Scripts Disponibles

### Gestión de Anuncios de Prueba

#### `createTestAd.js`
Crea un anuncio de prueba con configuración completa.

```bash
node src/scripts/createTestAd.js
```

**Crea:**
- Anuncio de prueba con imagen de Unsplash
- Balance inicial de 1000 DegaCoins
- Configuración de segmentación básica

#### `deleteTestAd.js`
Elimina el anuncio de prueba específico.

```bash
node src/scripts/deleteTestAd.js
```

### Mantenimiento y Limpieza

#### `cleanupAds.js`
Limpieza completa del sistema (elimina TODOS los anuncios de prueba).

```bash
node src/scripts/cleanupAds.js
```

**Elimina:**
- Todos los anuncios marcados como [PRUEBA]
- Impresiones asociadas
- (Opcional) Resetea balances y transacciones

#### `resetAdImpressions.js`
Resetea el contador de impresiones de un anuncio específico.

```bash
node src/scripts/resetAdImpressions.js
```

**Útil para:**
- Testing de límites de frecuencia
- Resetear contadores después de pruebas

#### `syncAll.js`
Sincronización completa de métricas y balances.

```bash
node src/scripts/syncAll.js
```

**Resetea:**
- Métricas del anuncio a 0
- Balance a 1000 DegaCoins
- Elimina todas las transacciones

### Utilidades

#### `checkBalance.js`
Verifica y crea balance si no existe.

```bash
node src/scripts/checkBalance.js
```

#### `updateTestAdLimit.js`
Actualiza el límite de impresiones del anuncio de prueba.

```bash
node src/scripts/updateTestAdLimit.js
```

## ⚠️ Advertencias

- **Producción**: NO ejecutar scripts de limpieza en producción
- **Backup**: Hacer backup antes de ejecutar scripts destructivos
- **Testing**: Usar solo en entorno de desarrollo

## 🔧 Configuración

Todos los scripts requieren:
- Archivo `.env` configurado
- Conexión a MongoDB
- Variables de entorno correctas

## 📚 Más Información

Ver documentación completa en:
- `docs/Funcionamiento_app/SistemaPublicidad.md`
