# 🚀 Script de Despliegue Rápido - Actualización R2

## ⚡ Comandos de Despliegue

### 📦 **BACKEND - Actualizar con R2**

```bash
# 1. Ir al directorio del backend
cd /var/www/degader-backend

# 2. Hacer backup rápido (opcional pero recomendado)
cp .env .env.backup

# 3. Actualizar código desde Git
git pull origin main

# 4. Instalar/actualizar dependencias
npm install

# 5. Reiniciar el servidor
pm2 restart degader-backend

# 6. Ver logs para verificar
pm2 logs degader-backend --lines 30
```

---

### 🌐 **FRONTEND - Actualizar (si es necesario)**

```bash
# 1. Ir al directorio del frontend
cd /var/www/degader-frontend

# 2. Actualizar código desde Git
git pull origin main

# 3. Instalar dependencias
npm install

# 4. Construir para producción
npm run build

# 5. Verificar estado
pm2 status
```

---

## ✅ **Verificación Post-Despliegue**

```bash
# Ver estado de todos los procesos
pm2 status

# Ver logs del backend en tiempo real
pm2 logs degader-backend

# Verificar que el servidor responde
curl http://localhost:3001/health

# Ver últimas 50 líneas de logs
pm2 logs degader-backend --lines 50
```

---

## 🔍 **Verificar Variables de Entorno R2**

```bash
# En el servidor, verificar que las variables de R2 están configuradas
cd /var/www/degader-backend
cat .env | grep R2
```

Deberías ver:
```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=degader-social-uploads
R2_PUBLIC_URL=https://pub-...
```

**Si NO están configuradas**, editar:
```bash
nano .env
```

Agregar las variables de R2 y guardar (Ctrl+O, Enter, Ctrl+X).

---

## 🧪 **Probar Funcionalidad R2**

### Desde el servidor:

```bash
# Ver logs en tiempo real mientras pruebas
pm2 logs degader-backend -f
```

### Desde tu navegador/Postman:

```
POST http://3.144.132.207:3001/api/publicaciones
Headers:
  Authorization: Bearer <tu_token>
Body (FormData):
  contenido: "Prueba de R2"
  media: [archivo.jpg]
```

Deberías ver en los logs:
```
📝 [CREATE POST] Request received
📤 [CREATE POST] Uploading 1 files to R2...
✅ [CREATE POST] File uploaded to R2: https://pub-xxx.r2.dev/posts/...
```

---

## 🔄 **Script Completo de Un Solo Comando**

```bash
# Copiar y pegar todo esto de una vez:

cd /var/www/degader-backend && \
git pull origin main && \
npm install && \
pm2 restart degader-backend && \
echo "✅ Backend actualizado" && \
pm2 logs degader-backend --lines 20
```

---

## 🐛 **Si Algo Sale Mal**

### Rollback rápido:

```bash
cd /var/www/degader-backend
git log --oneline -5  # Ver últimos commits
git reset --hard HEAD~1  # Volver al commit anterior
npm install
pm2 restart degader-backend
```

### Ver errores:

```bash
pm2 logs degader-backend --err --lines 50
```

### Reiniciar todo:

```bash
pm2 restart all
pm2 status
```

---

## 📊 **Monitoreo Continuo**

```bash
# Dashboard de PM2
pm2 monit

# Logs en tiempo real
pm2 logs

# Solo backend
pm2 logs degader-backend -f

# Solo errores
pm2 logs degader-backend --err
```

---

## ✅ **Checklist de Despliegue**

```
[ ] Conectado al servidor SSH
[ ] cd /var/www/degader-backend
[ ] git pull origin main
[ ] npm install
[ ] Variables R2 en .env verificadas
[ ] pm2 restart degader-backend
[ ] pm2 logs sin errores
[ ] Prueba de subida de imagen exitosa
[ ] pm2 status - todo en "online"
```

---

## 🎯 **Comandos Más Usados**

```bash
# Conectar
ssh -i "degader-social-key.pem" ubuntu@3.144.132.207

# Ver estado
pm2 status

# Ver logs
pm2 logs degader-backend

# Reiniciar
pm2 restart degader-backend

# Detener
pm2 stop degader-backend

# Iniciar
pm2 start degader-backend

# Reiniciar todo
pm2 restart all
```

---

**Fecha**: 2025-12-26  
**Actualización**: Soporte Cloudflare R2 para publicaciones y mensajes
