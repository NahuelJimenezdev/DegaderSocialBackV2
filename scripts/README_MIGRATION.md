# Script de Migración de Datos de Usuario

## Descripción
Este script transforma los documentos existentes en MongoDB de la estructura antigua a la nueva estructura modular del modelo User.

## Uso

### 1. Backup de la Base de Datos (IMPORTANTE)
Antes de ejecutar el script, haz un backup de tu base de datos:

```bash
mongodump --db degader --out ./backup
```

### 2. Ejecutar el Script
```bash
node scripts/migrateUserData.js
```

### 3. Verificar Resultados
El script mostrará un resumen con:
- ✅ Usuarios migrados exitosamente
- ⏭️ Usuarios ya migrados (saltados)
- ❌ Errores encontrados

## Qué hace el Script

### Transformaciones Aplicadas

| Campo Antiguo | Campo Nuevo |
|---------------|-------------|
| `nombre` | `nombres.primero` |
| `apellido` | `apellidos.primero` |
| `avatar` | `social.fotoPerfil` |
| `banner` | `social.fotoBanner` |
| `biografia` | `social.biografia` |
| `telefono` | `personal.celular` |
| `ciudad` | `personal.ubicacion.ciudad` |
| `pais` | `personal.ubicacion.pais` |
| `legajo` | `fundacion.codigoEmpleado` |
| `area` | `fundacion.area` |
| `cargo` | `fundacion.cargo` |
| `ministerio.*` | `eclesiastico.*` |

### Lógica de Flags

- `esMiembroFundacion`: Se activa si el usuario tiene `legajo`, `area` o `cargo`
- `esMiembroIglesia`: Se activa si el usuario tiene datos en `ministerio`

## Notas Importantes

- ⚠️ El script es **idempotente**: Puede ejecutarse múltiples veces sin duplicar datos
- ⚠️ Los usuarios ya migrados se saltan automáticamente
- ⚠️ Los datos originales se sobrescriben (por eso es crítico el backup)
- ✅ Los virtuals de compatibilidad permiten que el código antiguo siga funcionando

## Rollback (En caso de problemas)

Si algo sale mal, restaura desde el backup:

```bash
mongorestore --db degader ./backup/degader
```

## Verificación Post-Migración

Después de ejecutar el script, verifica que los usuarios se vean correctamente:

```javascript
// En MongoDB Compass o mongo shell
db.users.findOne()
```

Deberías ver la nueva estructura con `nombres`, `apellidos`, `personal`, etc.
