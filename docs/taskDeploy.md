# Guía de Despliegue - Degader Social Backend en VPS

## 📋 Requisitos Previos

- ✅ VPS con Ubuntu 20.04 o superior
- ✅ Acceso SSH al servidor
- ✅ Dominio configurado (opcional pero recomendado)
- ✅ Cuenta de MongoDB Atlas (ya configurada)

---

## 🚀 Paso 1: Preparar el Servidor VPS

### 1.1 Conectarse al VPS

```bash
ssh usuario@tu-servidor.com
# o
ssh usuario@IP_DEL_SERVIDOR
```

### 1.2 Actualizar el Sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Instalar Node.js (v18 o superior)

```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 1.4 Instalar PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 1.5 Instalar Nginx (Servidor Web)

```bash
sudo apt install -y nginx
```

### 1.6 Instalar Git

```bash
sudo apt install -y git
```

---

## 📦 Paso 2: Clonar y Configurar el Proyecto

### 2.1 Crear Directorio para la Aplicación

```bash
cd /var/www
sudo mkdir degader-backend
sudo chown -R $USER:$USER degader-backend
cd degader-backend
```

### 2.2 Clonar el Repositorio

```bash
git clone https://github.com/NahuelJimenezdev/DegaderSocialBackV2.git .
```

### 2.3 Instalar Dependencias

```bash
npm install
```

### 2.4 Configurar Variables de Entorno

```bash
nano .env
```

Agregar el siguiente contenido (ajustar según tus credenciales):

```env
# MongoDB Atlas
DB_USER=tu_usuario_mongodb
DB_PASS=tu_password_mongodb
DB_CLUSTER=cluster0.pcisms7.mongodb.net
DB_NAME=degader-social-v2

# JWT
JWT_SECRET=tu_clave_secreta_super_segura_aqui_cambiar

# Puerto
PORT=3001

# Entorno
NODE_ENV=production

# CORS (dominio del frontend)
FRONTEND_URL=https://tu-dominio-frontend.com
```

Guardar con `Ctrl + O`, Enter, `Ctrl + X`

### 2.5 Crear Directorio para Uploads

```bash
mkdir -p uploads/posts
mkdir -p uploads/profiles
mkdir -p uploads/groups
mkdir -p uploads/iglesias
chmod -R 755 uploads
```

---

## 🔧 Paso 3: Configurar PM2

### 3.1 Crear Archivo de Configuración PM2

```bash
nano ecosystem.config.js
```

Agregar:

```javascript
module.exports = {
  apps: [{
    name: 'degader-backend',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### 3.2 Crear Directorio de Logs

```bash
mkdir logs
```

### 3.3 Iniciar la Aplicación con PM2

```bash
pm2 start ecosystem.config.js
```

### 3.4 Configurar PM2 para Inicio Automático

```bash
pm2 startup
# Copiar y ejecutar el comando que aparece

pm2 save
```

### 3.5 Comandos Útiles de PM2

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs degader-backend

# Reiniciar
pm2 restart degader-backend

# Detener
pm2 stop degader-backend

# Eliminar
pm2 delete degader-backend

# Monitoreo
pm2 monit
```

---

## 🌐 Paso 4: Configurar Nginx como Reverse Proxy

### 4.1 Crear Configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/degader-backend
```

Agregar:

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;  # Cambiar por tu dominio

    # Logs
    access_log /var/log/nginx/degader-backend-access.log;
    error_log /var/log/nginx/degader-backend-error.log;

    # Tamaño máximo de archivos
    client_max_body_size 50M;

    # Proxy a la aplicación Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts para Socket.IO
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Servir archivos estáticos directamente
    location /uploads {
        alias /var/www/degader-backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 Habilitar el Sitio

```bash
sudo ln -s /etc/nginx/sites-available/degader-backend /etc/nginx/sites-enabled/
```

### 4.3 Verificar Configuración

```bash
sudo nginx -t
```

### 4.4 Reiniciar Nginx

```bash
sudo systemctl restart nginx
```

---

## 🔒 Paso 5: Configurar SSL con Let's Encrypt (HTTPS)

### 5.1 Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtener Certificado SSL

```bash
sudo certbot --nginx -d api.tu-dominio.com
```

Seguir las instrucciones en pantalla.

### 5.3 Renovación Automática

```bash
# Verificar renovación automática
sudo certbot renew --dry-run
```

---

## 🔥 Paso 6: Configurar Firewall

### 6.1 Configurar UFW

```bash
# Permitir SSH
sudo ufw allow OpenSSH

# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Habilitar firewall
sudo ufw enable

# Verificar estado
sudo ufw status
```

---

## 📊 Paso 7: Monitoreo y Mantenimiento

### 7.1 Ver Logs de la Aplicación

```bash
# Logs de PM2
pm2 logs degader-backend

# Logs de Nginx
sudo tail -f /var/log/nginx/degader-backend-access.log
sudo tail -f /var/log/nginx/degader-backend-error.log
```

### 7.2 Monitorear Recursos

```bash
# CPU y Memoria
pm2 monit

# Uso de disco
df -h

# Procesos
htop
```

### 7.3 Actualizar la Aplicación

```bash
cd /var/www/degader-backend

# Detener aplicación
pm2 stop degader-backend

# Actualizar código
git pull origin main

# Instalar nuevas dependencias (si hay)
npm install

# Reiniciar aplicación
pm2 restart degader-backend
```

---

## 🔄 Paso 8: Script de Actualización Automática

### 8.1 Crear Script de Deploy

```bash
nano deploy.sh
```

Agregar:

```bash
#!/bin/bash

echo "🚀 Iniciando despliegue..."

# Ir al directorio del proyecto
cd /var/www/degader-backend

# Guardar cambios locales (si hay)
git stash

# Actualizar código
echo "📥 Descargando últimos cambios..."
git pull origin main

# Restaurar cambios locales
git stash pop

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Reiniciar aplicación
echo "🔄 Reiniciando aplicación..."
pm2 restart degader-backend

echo "✅ Despliegue completado exitosamente!"

# Mostrar estado
pm2 status
```

### 8.2 Dar Permisos de Ejecución

```bash
chmod +x deploy.sh
```

### 8.3 Usar el Script

```bash
./deploy.sh
```

---

## 🐛 Solución de Problemas Comunes

### Problema: La aplicación no inicia

```bash
# Ver logs detallados
pm2 logs degader-backend --lines 100

# Verificar variables de entorno
cat .env

# Verificar puerto
sudo netstat -tulpn | grep 3001
```

### Problema: Error de conexión a MongoDB

```bash
# Verificar variables de entorno
echo $DB_USER
echo $DB_CLUSTER

# Probar conexión manualmente
node -e "const mongoose = require('mongoose'); mongoose.connect('tu_uri_completa').then(() => console.log('OK')).catch(err => console.error(err));"
```

### Problema: Nginx muestra 502 Bad Gateway

```bash
# Verificar que la app esté corriendo
pm2 status

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar servicios
pm2 restart degader-backend
sudo systemctl restart nginx
```

### Problema: Permisos de archivos

```bash
# Dar permisos correctos a uploads
sudo chown -R www-data:www-data /var/www/degader-backend/uploads
chmod -R 755 /var/www/degader-backend/uploads
```

---

## 📝 Checklist de Despliegue

- [ ] Servidor VPS configurado y actualizado
- [ ] Node.js instalado (v18+)
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado y configurado
- [ ] Repositorio clonado en `/var/www/degader-backend`
- [ ] Archivo `.env` configurado con credenciales correctas
- [ ] Dependencias instaladas (`npm install`)
- [ ] Directorios de uploads creados
- [ ] Aplicación iniciada con PM2
- [ ] PM2 configurado para inicio automático
- [ ] Nginx configurado como reverse proxy
- [ ] SSL/HTTPS configurado con Let's Encrypt
- [ ] Firewall (UFW) configurado
- [ ] Dominio apuntando al servidor
- [ ] Logs funcionando correctamente
- [ ] Script de deploy creado

---

## 🌟 Optimizaciones Adicionales (Opcional)

### Configurar Compresión Gzip en Nginx

Editar `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### Configurar Rate Limiting

Ya está implementado en el código con `express-rate-limit`.

### Configurar Backup Automático

```bash
# Crear script de backup
nano /home/usuario/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/usuario/backups"
mkdir -p $BACKUP_DIR

# Backup del código
tar -czf $BACKUP_DIR/degader-backend-$DATE.tar.gz /var/www/degader-backend

# Mantener solo últimos 7 backups
find $BACKUP_DIR -name "degader-backend-*.tar.gz" -mtime +7 -delete

echo "Backup completado: degader-backend-$DATE.tar.gz"
```

```bash
chmod +x /home/usuario/backup.sh

# Agregar a crontab (diario a las 2 AM)
crontab -e
# Agregar: 0 2 * * * /home/usuario/backup.sh
```

---

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs: `pm2 logs degader-backend`
2. Verifica la configuración de Nginx: `sudo nginx -t`
3. Comprueba el estado de los servicios: `pm2 status` y `sudo systemctl status nginx`
4. Revisa las variables de entorno en `.env`

---

## ✅ Verificación Final

Una vez completado el despliegue, verifica:

```bash
# 1. Aplicación corriendo
pm2 status

# 2. Respuesta del servidor
curl http://localhost:3001/api/health

# 3. Respuesta a través de Nginx
curl https://api.tu-dominio.com/api/health

# 4. Socket.IO funcionando
# Abrir en navegador: https://api.tu-dominio.com
```

¡Tu aplicación Node.js debería estar funcionando en producción! 🎉
