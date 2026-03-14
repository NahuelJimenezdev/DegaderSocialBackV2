const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true, // true para 465, false para otros puertos
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/**
 * Enviar correo de bienvenida
 */
const sendWelcomeEmail = async (user) => {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to: user.email,
            subject: '¡Te damos la bienvenida a Degader Social! 🌟',
            html: `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bienvenida a Degader Social</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f7f9;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                        color: #ffffff;
                        padding: 40px 20px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 700;
                    }
                    .content {
                        padding: 30px;
                    }
                    .content p {
                        margin-bottom: 20px;
                        font-size: 16px;
                    }
                    .button-container {
                        text-align: center;
                        margin: 30px 0;
                    }
                    .button {
                        background-color: #2563eb;
                        color: #ffffff !important;
                        padding: 12px 35px;
                        text-decoration: none;
                        border-radius: 50px;
                        font-weight: bold;
                        display: inline-block;
                        transition: background-color 0.3s;
                    }
                    .features {
                        background-color: #f8fafc;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .features h3 {
                        margin-top: 0;
                        color: #1e3a8a;
                        font-size: 18px;
                    }
                    .features ul {
                        padding-left: 20px;
                        margin: 0;
                    }
                    .features li {
                        margin-bottom: 8px;
                    }
                    .footer {
                        background-color: #f1f5f9;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #64748b;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer a {
                        color: #2563eb;
                        text-decoration: none;
                    }
                    .social-links {
                        margin-bottom: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Bienvenido a Degader Social!</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${user.nombres.primero}</strong>,</p>
                        
                        <p>Te damos la bienvenida a <strong>Degader Social</strong>, una plataforma creada para conectar personas, fortalecer comunidades y generar impacto positivo a través de la colaboración y el servicio.</p>
                        
                        <p>Aquí podrás participar en una red donde la tecnología se utiliza con propósito: ayudar, apoyar y construir espacios donde las personas puedan crecer en lo personal, social y espiritual.</p>

                        <div class="features">
                            <h3>Lo que puedes hacer en Degader Social:</h3>
                            <ul>
                                <li>Conectarte con personas y comunidades</li>
                                <li>Participar en reuniones y grupos</li>
                                <li>Compartir publicaciones y contenido</li>
                                <li>Colaborar en proyectos sociales y comunitarios</li>
                                <li>Recibir notificaciones y actualizaciones importantes</li>
                            </ul>
                        </div>

                        <p><strong>Degader Social funciona donde tú estés</strong>. Accede desde tu smartphone o laptop (Windows, Mac o cualquier dispositivo) y mantente conectado con tu comunidad desde cualquier lugar.</p>

                        <p>Nuestro objetivo es construir un espacio donde la comunidad y la tecnología trabajen juntas para ayudar a las personas y fortalecer a quienes desean servir a otros.</p>
                        
                        <div class="button-container">
                            <a href="https://degadersocial.com/" class="button">Ingresar a mi cuenta</a>
                        </div>

                        <p>Equipo de Degader Social</p>
                    </div>
                    <div class="footer">
                        <p>Recibiste este correo porque te registraste en Degader Social o fuiste invitado a formar parte de la plataforma.</p>
                        <p><a href="https://degadersocial.com/privacidad">Política de Privacidad</a></p>
                        <p>&copy; 2026 Degader Social</p>
                    </div>
                </div>
            </body>
            </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo de bienvenida enviado:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error al enviar correo de bienvenida:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWelcomeEmail
};
