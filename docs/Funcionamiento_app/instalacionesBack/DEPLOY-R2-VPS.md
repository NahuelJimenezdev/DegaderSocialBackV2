# 🚀 Guía de Despliegue - Actualización R2 en Servidor VPS

## ✅ Checklist Pre-Despliegue

Antes de subir los cambios al servidor, verifica:

- [ ] Cloudflare R2 configurado y funcionando
- [ ] Variables de entorno `.env` configuradas localmente
- [ ] Código actualizado y probado localmente
- [ ] Credenciales de R2 guardadas de forma segura

---

## 📋 PASO 1: Verificar Configuración Local

### 1.1 Verificar que el archivo `.env` tiene las variables de R2:

```bash
# En tu máquina local
cd c:\Users\VientodeVida\.gemini\antigravity\scratch\DegaderSocialBackV2
```

Tu `.env` debe tener:

```env
# Cloudflare R2
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET_NAME=degader-social-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### 1.2 Verificar archivos creados:

```bash
# Verificar que existen estos archivos
ls src/config/r2.js
ls src/services/r2Service.js
```

---

## 🔐 PASO 2: Conectarse al Servidor VPS

```bash
# Navegar a la carpeta con la clave SSH
cd "D:\Documentos\PC\Documentos\Degader_2026"

# Conectarse al servidor
ssh -i "degader-social-key.pem" ubuntu@3.144.132.207
```

---

## 📦 PASO 3: Actualizar Código en el Servidor

### 3.1 Navegar al directorio del backend:

```bash
cd ~/DegaderSocialBackV2
# O la ruta donde esté tu backend
```

### 3.2 Hacer backup del código actual:

```bash
# Crear backup
cp -r ~/DegaderSocialBackV2 ~/DegaderSocialBackV2_backup_$(date +%Y%m%d_%H%M%S)
```

### 3.3 Actualizar código desde Git:

```bash
# Ver estado actual
git status

# Guardar cambios locales si los hay
git stash

# Actualizar desde el repositorio
git pull origin main
# O la rama que uses

# Restaurar cambios locales si es necesario
git stash pop
```

**ALTERNATIVA:** Si subes los archivos manualmente con SCP/SFTP, salta al Paso 3.4.

### 3.4 Verificar archivos actualizados:

```bash
# Verificar que los nuevos archivos existen
ls -la src/controllers/postController.js
ls -la src/controllers/conversationController.js
ls -la src/services/r2Service.js
ls -la src/config/r2.js
ls -la src/middleware/upload.middleware.js
```

---

## ⚙️ PASO 4: Configurar Variables de Entorno en el Servidor

### 4.1 Editar el archivo `.env`:

```bash
nano .env
```

### 4.2 Agregar/Verificar las variables de R2:

```env
# Cloudflare R2
R2_ACCOUNT_ID=tu_account_id_real
R2_ACCESS_KEY_ID=tu_access_key_real
R2_SECRET_ACCESS_KEY=tu_secret_access_key_real
R2_BUCKET_NAME=degader-social-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**IMPORTANTE:** Reemplaza los valores con tus credenciales reales de Cloudflare R2.

### 4.3 Guardar y salir:

```
Ctrl + O  (guardar)
Enter     (confirmar)
Ctrl + X  (salir)
```

---

## 📦 PASO 5: Instalar/Verificar Dependencias

### 5.1 Verificar que las dependencias de R2 están instaladas:

```bash
# Ver package.json
cat package.json | grep "@aws-sdk"
```

Deberías ver:
```json
"@aws-sdk/client-s3": "^3.958.0",
"@aws-sdk/s3-request-presigner": "^3.958.0",
```

### 5.2 Instalar dependencias si es necesario:

```bash
npm install
```

---

## 🔄 PASO 6: Reiniciar el Servidor Backend

### 6.1 Si usas PM2:

```bash
# Ver procesos actuales
pm2 list

# Reiniciar el backend
pm2 restart degader-backend
# O el nombre de tu proceso

# Ver logs en tiempo real
pm2 logs degader-backend
```

### 6.2 Si usas systemd:

```bash
sudo systemctl restart degader-backend
sudo systemctl status degader-backend
```

### 6.3 Si usas npm directamente:

```bash
# Detener proceso actual (Ctrl+C si está corriendo)
# Luego iniciar:
npm start
# O
npm run dev
```

---

## 🧪 PASO 7: Verificar que el Servidor Funciona

### 7.1 Verificar que el servidor está corriendo:

```bash
# Ver logs
pm2 logs degader-backend --lines 50

# O si usas systemd
sudo journalctl -u degader-backend -n 50 -f
```

### 7.2 Verificar endpoint de salud:

```bash
curl http://localhost:3001/health
```

Deberías ver:
```json
{
  "status": "OK",
  "database": "Connected",
  "uptime": 123.456
}
```

### 7.3 Verificar logs de R2:

Busca en los logs:
```
✅ Conectado a MongoDB
🚀 Servidor HTTP corriendo en http://localhost:3001
```

No deberías ver errores relacionados con R2.

---

## 🔍 PASO 8: Probar Funcionalidad de R2

### 8.1 Desde tu máquina local, probar crear una publicación con imagen:

```bash
# Usar Postman, Thunder Client o curl
curl -X POST http://3.144.132.207:3001/api/publicaciones \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "contenido=Prueba de R2" \
  -F "media=@ruta/a/imagen.jpg"
```

### 8.2 Verificar en los logs del servidor:

```bash
pm2 logs degader-backend --lines 20
```

Deberías ver:
```
📝 [CREATE POST] Request received
📤 [CREATE POST] Uploading 1 files to R2...
✅ [CREATE POST] File uploaded to R2: https://pub-xxx.r2.dev/posts/abc123.jpg
✅ [CREATE POST] Post saved with ID: 67...
```

---

## 🐛 Solución de Problemas

### Error: "R2_ACCOUNT_ID is not defined"

```bash
# Verificar variables de entorno
cat .env | grep R2

# Reiniciar el servidor después de editar .env
pm2 restart degader-backend
```

### Error: "Access Denied" al subir a R2

```bash
# Verificar credenciales en .env
# Verificar permisos del token en Cloudflare Dashboard
# Asegurarse que el token tiene permisos de Object Read & Write
```

### Error: "Bucket not found"

```bash
# Verificar nombre del bucket
cat .env | grep R2_BUCKET_NAME

# Verificar que el bucket existe en Cloudflare Dashboard
```

### El servidor no inicia después de actualizar

```bash
# Ver logs completos
pm2 logs degader-backend --err

# Verificar sintaxis de archivos JS
node --check src/controllers/postController.js
node --check src/services/r2Service.js
```

---

## 📊 PASO 9: Monitoreo Post-Despliegue

### 9.1 Monitorear logs durante las primeras horas:

```bash
pm2 logs degader-backend -f
```

### 9.2 Verificar uso de R2 en Cloudflare:

1. Ir a Cloudflare Dashboard
2. R2 → Tu bucket
3. Ver estadísticas de uso

### 9.3 Verificar que las imágenes se cargan:

```bash
# Probar URL de una imagen subida
curl -I https://pub-xxxxx.r2.dev/posts/imagen.jpg
```

Deberías ver `HTTP/2 200`

---

## 🔒 PASO 10: Seguridad Post-Despliegue

### 10.1 Verificar que `.env` no está en Git:

```bash
cat .gitignore | grep .env
```

Debe contener:
```
.env
.env.local
.env.*.local
```

### 10.2 Verificar permisos del archivo `.env`:

```bash
ls -la .env
```

Debe ser:
```
-rw------- 1 ubuntu ubuntu ... .env
```

Si no, corregir:
```bash
chmod 600 .env
```

---

## ✅ Checklist Final

- [ ] Código actualizado en el servidor
- [ ] Variables de entorno `.env` configuradas
- [ ] Dependencias instaladas
- [ ] Servidor reiniciado correctamente
- [ ] Endpoint `/health` responde OK
- [ ] Prueba de subida de imagen exitosa
- [ ] Logs sin errores
- [ ] Imágenes accesibles desde R2
- [ ] Monitoreo activo

---

## 📝 Comandos Rápidos de Referencia

```bash
# Conectar al servidor
ssh -i "degader-social-key.pem" ubuntu@3.144.132.207

# Ver logs
pm2 logs degader-backend

# Reiniciar servidor
pm2 restart degader-backend

# Ver estado
pm2 status

# Editar .env
nano .env

# Ver procesos
pm2 list

# Detener servidor
pm2 stop degader-backend

# Iniciar servidor
pm2 start degader-backend
```

---

## 🚨 Rollback (Si algo sale mal)

### Si necesitas volver a la versión anterior:

```bash
# Detener servidor actual
pm2 stop degader-backend

# Restaurar backup
rm -rf ~/DegaderSocialBackV2
cp -r ~/DegaderSocialBackV2_backup_FECHA ~/DegaderSocialBackV2

# Volver al directorio
cd ~/DegaderSocialBackV2

# Reinstalar dependencias
npm install

# Reiniciar
pm2 restart degader-backend
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `pm2 logs degader-backend --err`
2. Verifica variables de entorno: `cat .env | grep R2`
3. Verifica conectividad a R2: Prueba subir un archivo manualmente
4. Revisa Cloudflare Dashboard para ver errores de R2

---

**Fecha**: 2025-12-26  
**Versión**: 2.1.0  
**Actualización**: Soporte Cloudflare R2
