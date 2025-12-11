# 📚 Funcionamiento de la Aplicación DegaderSocial

Esta carpeta contiene la documentación técnica completa sobre cómo funciona cada componente de la aplicación.

---

## 🎯 Propósito

Esta documentación sirve como **referencia técnica** para:

✅ **Entender dependencias** - Saber qué archivos y componentes dependen entre sí  
✅ **Identificar causas de errores** - Guías de troubleshooting para cada funcionalidad  
✅ **Evitar romper código funcional** - Conocer qué NO modificar cuando se arregla un error  
✅ **Mantener consistencia** - Asegurar que todos los componentes usen la misma estructura  
✅ **Prevenir código duplicado** - Evitar crear soluciones redundantes

---

## 📂 Estructura de Documentación

### ✅ **Documentación Completa**

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| **[Login.md](./Login.md)** | Sistema de autenticación con JWT | ✅ Completo |
| **[Perfil.md](./Perfil.md)** | Visualización y edición de perfil (UserV2) | ✅ Completo |

### 📝 **Documentación Pendiente** (Placeholders)

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| **[Inicio.md](./Inicio.md)** | Página principal y feed de publicaciones | 🔄 Pendiente |
| **[Amigos.md](./Amigos.md)** | Sistema de amistades y solicitudes | 🔄 Pendiente |
| **[Mensajes.md](./Mensajes.md)** | Sistema de mensajería privada | 🔄 Pendiente |
| **[MisReuniones.md](./MisReuniones.md)** | Gestión de reuniones virtuales | 🔄 Pendiente |
| **[Grupos.md](./Grupos.md)** | Sistema de grupos y miembros | 🔄 Pendiente |
| **[Institucion.md](./Institucion.md)** | Gestión de instituciones (iglesias) | 🔄 Pendiente |
| **[MisCarpetas.md](./MisCarpetas.md)** | Sistema de carpetas y archivos | 🔄 Pendiente |

---

## 🔍 Cómo Usar Esta Documentación

### **Cuando Encuentres un Error:**

1. **Identifica la funcionalidad afectada** (Login, Perfil, Mensajes, etc.)
2. **Abre el archivo .md correspondiente**
3. **Revisa la sección "Errores Comunes y Soluciones"**
4. **Verifica los archivos relacionados** antes de hacer cambios
5. **Sigue las reglas importantes** para no romper código funcional

### **Antes de Modificar Código:**

1. **Consulta la documentación** de la funcionalidad
2. **Verifica qué archivos dependen** del código que vas a cambiar
3. **Lee las "Reglas Importantes"** para evitar errores
4. **Usa las funciones auxiliares** recomendadas en lugar de duplicar código

---

## 🚨 Reglas Generales Importantes

### **1. NO DUPLICAR CÓDIGO**
Si una funcionalidad ya existe y funciona, **NO crear archivos nuevos** para solucionar un error. Arreglar el código existente.

### **2. USAR ESTRUCTURA USERV2**
El modelo de usuario usa una estructura jerárquica:
- ✅ `user.nombres.primero` (correcto)
- ❌ `user.nombre` (incorrecto)

### **3. MANTENER CONSISTENCIA**
Todos los componentes deben usar las mismas funciones auxiliares y estructura de datos.

### **4. VERIFICAR ANTES DE CAMBIAR**
Antes de modificar código, verificar:
- ¿Qué está funcionando actualmente?
- ¿Qué componentes dependen de este código?
- ¿Hay una solución documentada para este error?

### **5. NO MODIFICAR MODELOS SIN NECESIDAD**
Los modelos de datos (User, Post, Group, etc.) tienen una estructura específica. No cambiarlos sin entender las dependencias.

---

## 📖 Formato de Cada Documento

Cada archivo de documentación sigue esta estructura:

```markdown
# [Funcionalidad] - Descripción

## 📋 Descripción General
Explicación de qué hace esta funcionalidad

## 🔧 Componentes Principales
### Backend
- Modelos
- Controladores
- Rutas
- Middlewares

### Frontend
- Componentes
- Contextos
- Páginas

## ⚠️ Errores Comunes y Soluciones
Lista de errores frecuentes con sus causas y soluciones

## 🔍 Dependencias Críticas
Paquetes npm necesarios

## 📝 Variables de Entorno
Variables .env requeridas

## ✅ Checklist de Verificación
Lista de verificación cuando hay problemas

## 🔗 Archivos Relacionados
Lista de archivos que dependen de esta funcionalidad

## 🚨 Reglas Importantes
Reglas específicas para esta funcionalidad

## 📚 Notas Adicionales
Información extra relevante
```

---

## 🛠️ Proyecto DegaderSocial

**Backend:** `C:\Users\Nahuel Jiménez\Documents\00_ProyectosWeb\Degader\DegaderSocialBackV2`

**Tecnologías:**
- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticación
- Socket.IO para tiempo real
- bcrypt para contraseñas

---

## 📝 Contribuir a la Documentación

A medida que se desarrollen y prueben más funcionalidades, se irán completando los archivos pendientes con:

- Detalles de implementación
- Errores encontrados y sus soluciones
- Dependencias específicas
- Ejemplos de código
- Casos de uso

---

## ⚡ Inicio Rápido

Para resolver un error rápidamente:

1. **Login no funciona** → Ver [Login.md](./Login.md)
2. **Perfil no muestra datos** → Ver [Perfil.md](./Perfil.md)
3. **Otros problemas** → Revisar el archivo correspondiente

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0
