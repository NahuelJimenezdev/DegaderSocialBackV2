🚀 Guía Completa de Deployment - DegaderSocial en AWS EC2
Basada en los videos de YouTube + Adaptada para tu proyecto

📹 Videos de Referencia
Parte 1: Cómo obtener un VPS gratuito en AWS EC2 (2025)
Parte 2: Configurar Dominio + SSL con Nginx y Certbot
📋 Resumen del Proceso
Tu proyecto DegaderSocial tiene:

Backend: Node.js + Express + Socket.IO + MongoDB Atlas
Frontend: React + Vite
Vamos a deployar ambos en AWS EC2 gratis por 1 año.

💰 Análisis de Costos y Escalamiento
Instancia Recomendada: t3.small ⭐
Característica	Valor
vCPUs	2
RAM	2 GB
Usuarios soportados	100-200 concurrentes
Costo año 1	GRATIS (+ $0-2/mes si excedes 15GB transferencia)
Costo después	$15-17/mes
Plan de Escalamiento:
Usuarios	Instancia	RAM	Costo (después año 1)
0-200	t3.small ⭐	2 GB	$15-17/mes
200-500	t3.medium	4 GB	$30-38/mes
500-1000	t3.large	8 GB	$60-75/mes
1000+	Load Balancer + múltiples t3.small	-	$200-300/mes
¿Qué te hace pagar?
✅ GRATIS el primer año:

750 horas/mes de EC2 (suficiente para 24/7)
30 GB de almacenamiento
15 GB de transferencia saliente/mes
❌ Pagas si excedes:

Transferencia >15 GB/mes ($0.09/GB adicional)
Almacenamiento >30 GB
Snapshots/backups
🎯 PARTE 1: Crear VPS Gratuito en AWS EC2
Paso 1.1: Crear Cuenta de AWS
Ve a aws.amazon.com
Haz clic en "Crear cuenta de AWS"
Completa el formulario:
Email
Contraseña
Nombre de cuenta AWS
Información de contacto:
Tipo de cuenta: Personal
Nombre completo
Teléfono
Dirección
Información de pago:
Ingresa tarjeta de crédito/débito
AWS cobrará $1 para verificación (se devuelve)
Verificación de identidad:
Recibirás llamada o SMS con código
Ingresa el código
Selecciona plan:
Elige "Plan de soporte básico" (GRATIS)
Paso 1.2: Crear Instancia EC2
Accede a la Consola de AWS:

Inicia sesión en console.aws.amazon.com
Busca EC2:

En la barra de búsqueda superior, escribe "EC2"
Haz clic en "EC2"
Lanzar Instancia:

Haz clic en "Launch Instance" (Lanzar instancia)
Configurar la Instancia:

Nombre:

degader-social-server
Sistema Operativo (AMI):

Selecciona: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
⚠️ IMPORTANTE: Asegúrate que diga "Free tier eligible" ✅
❌ NO selecciones:
Ubuntu Pro (cuesta extra)
RHEL (cuesta extra)
Windows Server (cuesta extra)
Tipo de Instancia:

Selecciona: t3.small (2 vCPU, 2 GB RAM) ⭐ RECOMENDADO
Debe decir "Free tier eligible" ✅
Alternativas gratuitas:
t3.micro (2 vCPU, 1 GB) - Para 50-100 usuarios
t3.medium (2 vCPU, 4 GB) - Para 200-500 usuarios
Par de claves (Key pair):

Haz clic en "Create new key pair"
Nombre: degader-social-key
Tipo: RSA
Formato: .pem (para Mac/Linux) o .ppk (para Windows con PuTTY)
Haz clic en "Create key pair"
IMPORTANTE: Guarda este archivo en un lugar seguro, lo necesitarás para conectarte
Configuración de red:

Marca las siguientes casillas:
✅ Allow SSH traffic from (Anywhere 0.0.0.0/0)
✅ Allow HTTPS traffic from the internet
✅ Allow HTTP traffic from the internet
Almacenamiento:

20 GB gp3 (recomendado para producción)
Máximo 30 GB gratis
Lanzar Instancia:

Haz clic en "Launch instance"
Espera unos segundos
Haz clic en "View all instances"
Obtener IP Pública:

Selecciona tu instancia
Copia la "Public IPv4 address" (ejemplo: 54.123.45.67)
Paso 1.3: Conectarse al VPS
En Windows (usando PowerShell o CMD):

# 1. Navega a la carpeta donde guardaste la key
cd C:\Users\TuUsuario\Downloads
# 2. Conecta usando SSH
ssh -i "degader-social-key.pem" ubuntu@TU_IP_PUBLICA
En Mac/Linux:

# 1. Dar permisos a la key
chmod 400 degader-social-key.pem
# 2. Conectar
ssh -i degader-social-key.pem ubuntu@TU_IP_PUBLICA
Si te pregunta "Are you sure you want to continue connecting?", escribe yes y presiona Enter.

🔧 PARTE 2: Configurar el Servidor
Paso 2.1: Actualizar el Sistema
sudo apt update
sudo apt upgrade -y
Paso 2.2: Instalar Node.js 20.x
# Descargar e instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Verificar instalación
node --version  # Debe mostrar v20.x.x
npm --version   # Debe mostrar 10.x.x
Paso 2.3: Instalar PM2 (Process Manager)
sudo npm install -g pm2
Paso 2.4: Instalar Nginx
sudo apt install -y nginx
Paso 2.5: Instalar Git
sudo apt install -y git
📦 PARTE 3: Deployar el Backend
Paso 3.1: Clonar el Repositorio del Backend
# Crear directorio
cd /var/www
sudo mkdir degader-backend
sudo chown -R $USER:$USER degader-backend
cd degader-backend
# Clonar
git clone https://github.com/NahuelJimenezdev/DegaderSocialBackV2.git .
Paso 3.2: Configurar Variables de Entorno
nano .env
Pega el siguiente contenido (ajusta con tus credenciales):

# MongoDB Atlas
DB_USER=tu_usuario_mongodb
DB_PASS=tu_password_mongodb
DB_CLUSTER=cluster0.pcisms7.mongodb.net
DB_NAME=degader-social-v2
# JWT
JWT_SECRET=tu_clave_secreta_super_segura_cambiar_esto
# Puerto
PORT=3001
# Entorno
NODE_ENV=production
# CORS - Dominio del frontend (ajustar después)
FRONTEND_URL=https://tu-dominio.com
Guardar: Ctrl + O, Enter, Ctrl + X

Paso 3.3: Instalar Dependencias
npm install
Paso 3.4: Crear Directorios de Uploads
mkdir -p uploads/posts
mkdir -p uploads/profiles
mkdir -p uploads/groups
mkdir -p uploads/iglesias
chmod -R 755 uploads
Paso 3.5: Iniciar con PM2
# Iniciar aplicación
pm2 start src/index.js --name degader-backend
# Configurar inicio automático
pm2 startup
# Copia y ejecuta el comando que aparece
pm2 save
# Ver estado
pm2 status
📦 PARTE 4: Deployar el Frontend
Paso 4.1: Clonar el Repositorio del Frontend
cd /var/www
sudo mkdir degader-frontend
sudo chown -R $USER:$USER degader-frontend
cd degader-frontend
git clone https://github.com/NahuelJimenezdev/DegaderSocialFrontV2.git .
Paso 4.2: Configurar Variables de Entorno
nano .env
Pega:

VITE_API_URL=https://api.tu-dominio.com
Guardar: Ctrl + O, Enter, Ctrl + X

Paso 4.3: Instalar Dependencias y Buildear
npm install
npm run build
Esto creará una carpeta dist con los archivos estáticos.

🌐 PARTE 5: Configurar Dominio y Nginx
Paso 5.1: Configurar DNS (en tu proveedor de dominio)
Necesitas crear 2 registros DNS:

Registro A para el backend:

Tipo: A
Nombre: api
Valor: TU_IP_PUBLICA_AWS
TTL: 3600
Registro A para el frontend:

Tipo: A
Nombre: @ (o www)
Valor: TU_IP_PUBLICA_AWS
TTL: 3600
Espera 5-10 minutos para que se propaguen los cambios.

Paso 5.2: Configurar Nginx para el Backend
sudo nano /etc/nginx/sites-available/degader-backend
Pega:

server {
    listen 80;
    server_name api.tu-dominio.com;
    client_max_body_size 50M;
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
    location /uploads {
        alias /var/www/degader-backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
Guardar y habilitar:

sudo ln -s /etc/nginx/sites-available/degader-backend /etc/nginx/sites-enabled/
Paso 5.3: Configurar Nginx para el Frontend
sudo nano /etc/nginx/sites-available/degader-frontend
Pega:

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    root /var/www/degader-frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
Guardar y habilitar:

sudo ln -s /etc/nginx/sites-available/degader-frontend /etc/nginx/sites-enabled/
Paso 5.4: Verificar y Reiniciar Nginx
# Verificar configuración
sudo nginx -t
# Si todo está OK, reiniciar
sudo systemctl restart nginx
🔒 PARTE 6: Configurar SSL (HTTPS) con Certbot
Paso 6.1: Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
Paso 6.2: Obtener Certificados SSL
Para el backend:

sudo certbot --nginx -d api.tu-dominio.com
Para el frontend:

sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
Sigue las instrucciones:

Ingresa tu email
Acepta los términos (Y)
Elige si quieres compartir tu email (N o Y)
Elige opción 2: "Redirect" (redirigir HTTP a HTTPS)
Paso 6.3: Verificar Renovación Automática
sudo certbot renew --dry-run
Si no hay errores, los certificados se renovarán automáticamente.

🔥 PARTE 7: Configurar Firewall
# Permitir SSH
sudo ufw allow OpenSSH
# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'
# Habilitar firewall
sudo ufw enable
# Verificar
sudo ufw status
✅ PARTE 8: Verificación Final
8.1: Verificar Backend
# Ver logs de PM2
pm2 logs degader-backend
# Probar endpoint
curl https://api.tu-dominio.com/api/health
8.2: Verificar Frontend
Abre en tu navegador:

https://tu-dominio.com
Deberías ver tu aplicación funcionando con HTTPS ✅

🔄 PARTE 9: Script de Actualización
Crea un script para actualizar fácilmente:

nano ~/update-degader.sh
Pega:

#!/bin/bash
echo "🚀 Actualizando DegaderSocial..."
# Backend
echo "📦 Actualizando Backend..."
cd /var/www/degader-backend
git pull origin main
npm install
pm2 restart degader-backend
# Frontend
echo "🎨 Actualizando Frontend..."
cd /var/www/degader-frontend
git pull origin main
npm install
npm run build
echo "✅ Actualización completada!"
pm2 status
Dar permisos:

chmod +x ~/update-degader.sh
Usar:

~/update-degader.sh
🐛 Solución de Problemas
Backend no inicia
pm2 logs degader-backend --lines 50
Nginx muestra 502
# Verificar que PM2 esté corriendo
pm2 status
# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
SSL no funciona
# Verificar certificados
sudo certbot certificates
# Renovar manualmente
sudo certbot renew
📊 Monitoreo
# Ver estado de PM2
pm2 monit
# Ver uso de recursos
htop
# Ver logs en tiempo real
pm2 logs degader-backend --lines 100
💰 Costos de AWS (Nivel Gratuito)
Durante el primer año:

✅ 750 horas/mes de instancia t2.micro (suficiente para 24/7)
✅ 30 GB de almacenamiento EBS
✅ 15 GB de transferencia de datos salientes
Después del primer año:

~$8-10 USD/mes por la instancia t2.micro
Puedes migrar a otro proveedor o continuar en AWS
🎯 Checklist Final
 Cuenta de AWS creada
 Instancia EC2 lanzada (t2.micro)
 Conectado por SSH
 Node.js, PM2, Nginx, Git instalados
 Backend clonado y configurado
 Frontend clonado y buildeado
 DNS configurado (api.tu-dominio.com y tu-dominio.com)
 Nginx configurado para backend y frontend
 SSL/HTTPS configurado con Certbot
 Firewall (UFW) habilitado
 Aplicación funcionando en HTTPS
 Script de actualización creado
🌟 Próximos Pasos
Configurar backups automáticos
Configurar monitoreo con PM2 Plus (opcional)
Configurar CI/CD con GitHub Actions (opcional)
Optimizar rendimiento de Nginx
¡Tu aplicación DegaderSocial está ahora en producción! 🎉