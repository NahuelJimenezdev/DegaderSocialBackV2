# Sistema de Publicidad Segmentada - DegaderSocial

## 📋 Objetivo General
Implementar un sistema profesional de publicidad segmentada en el sidebar derecho (reemplazando AdsSidebar) que permita a clientes externos promocionar sus productos/servicios con targeting avanzado por edad, género, ubicación e intereses.

---

## ⚠️ Áreas de Mejora Identificadas

### 1. Privacidad del Usuario
- ✅ Necesitas que el usuario **consienta** dar su ubicación
- ✅ Debes tener una sección de "Preferencias de Publicidad" donde puedan optar por no recibir anuncios segmentados

### 2. Modelo de Usuario
- ❌ Tu modelo `UserV2` actual **no tiene** campos como `intereses`, `ubicación`, `fechaNacimiento` completos
- ✅ Necesitamos extenderlo o crear un sub-schema de "Perfil Publicitario"
- ❌ Falta campo `genero` en el registro

### 3. Rotación de Anuncios
- ⚠️ Si solo muestras 2-3 anuncios fijos, el usuario los verá siempre
- ✅ Deberíamos implementar un sistema de **rotación inteligente** (no mostrar el mismo anuncio 2 veces seguidas)

### 4. Panel de Administración
Necesitas una interfaz donde tus clientes (ej: librería cristiana) puedan:
- Subir su anuncio
- Configurar la segmentación
- Ver estadísticas en tiempo real

**Decisión:** Panel dual:
- **Founder Dashboard:** Ver todas las campañas de todos los clientes
- **Client Dashboard:** Cada cliente ve solo sus propias campañas

---

## 💡 Propuestas de Mejora

### Propuesta 1: Sistema de Intereses Implícitos
En lugar de pedirle al usuario que seleccione "Religión, Deportes, Música", podemos **inferir** sus intereses basándonos en:
- Qué grupos sigue
- Qué iglesias sigue
- Qué publicaciones le da "like"
- Qué hashtags usa

**Ventaja:** No molestas al usuario con formularios largos.

### Propuesta 2: Ubicación Opcional con Fallback
```javascript
// Estrategia de 3 niveles:
1. Si el usuario dio permiso GPS → Usar coordenadas exactas
2. Si no → Usar ciudad/país del perfil
3. Si tampoco → Mostrar anuncios "globales" (sin restricción geográfica)
```

### Propuesta 3: Frecuencia de Impresión
```javascript
// En el modelo Ad, agregar:
maxImpresionesUsuario: { type: Number, default: 3 }
// Para que un usuario no vea la misma Biblia 50 veces
```

### Propuesta 4: Prioridad de Anuncios
```javascript
// Sistema de "Puja" (como Google Ads)
prioridad: { 
  type: String, 
  enum: ['basica', 'premium', 'destacada'],
  default: 'basica'
}
// Los clientes que pagan más aparecen primero
```

### Propuesta 5: Sistema de Créditos Internos (DegaCoins)
**Recomendación:** Implementar moneda virtual interna de la plataforma.

**Ventajas:**
- ✅ Automatización total (no manual)
- ✅ Los clientes compran paquetes de créditos
- ✅ Cada impresión/click descuenta automáticamente
- ✅ Puedes ofrecer bonos y promociones
- ✅ Sistema escalable

**Ejemplo de Paquetes:**
```javascript
{
  basico: { creditos: 1000, precio: 50 },    // $0.05 por impresión
  premium: { creditos: 5000, precio: 200 },  // $0.04 por impresión (descuento)
  empresarial: { creditos: 20000, precio: 600 } // $0.03 por impresión
}
```

**Cómo funciona:**
1. Cliente compra 1000 DegaCoins por $50
2. Cada vez que su anuncio se muestra → -1 DegaCoin
3. Cuando llega a 0 → Campaña se pausa automáticamente
4. Cliente recibe alerta: "Recarga tus créditos"

---

## 🎯 Arquitectura Recomendada (Versión Avanzada)

### ✅ Fase 1: Fundamentos del Sistema - COMPLETADA
- ✅ Crear modelo `Ad` con segmentación completa
- ✅ Extender modelo `UserV2` con perfil publicitario (`perfilPublicitario`)
- ✅ Crear modelo `AdImpression` (registro de vistas y clicks combinado)
- ✅ Renombrar `QuickSearch.jsx` a `AdsSidebar.jsx`
- ✅ Implementar endpoint `/api/ads/recommendations` (17 endpoints totales)
- ✅ Crear componente `AdCard.jsx` en frontend
- ✅ Integrar AdCard en AdsSidebar con tracking automático

### ✅ Fase 2: Sistema de Créditos (DegaCoins) - MODELOS Y LÓGICA BÁSICA COMPLETADOS
- ✅ Crear modelo `AdCredit` (balance de cada cliente)
- ✅ Crear modelo `CreditTransaction` (historial de compras/gastos)
- ✅ Endpoint de compra de créditos (simulado)
- ✅ Sistema de descuento automático por impresión
- ✅ Alertas de saldo bajo (en modelo)
- ⏳ Integración de pagos (Stripe/PayPal) - PENDIENTE

### ⏳ Fase 3: Segmentación Avanzada - EN PROGRESO
- ✅ Algoritmo de segmentación por edad, género, intereses, ubicación
- ✅ Control de frecuencia de impresión por usuario
- ⏳ Inferencia de intereses (basado en actividad) - PENDIENTE
- ⏳ Geolocalización con consentimiento - PENDIENTE (solicitud implementada, falta UI de consentimiento)
- ⏳ Sistema de rotación inteligente - PENDIENTE

### ✅ Fase 4: Panel de Administración y Tracking - COMPLETADO

**Sistema de Tracking:**
- ✅ Intersection Observer para detección automática de impresiones (50% visible)
- ✅ Registro de impresiones con metadata (dispositivo, navegador, SO, página origen)
- ✅ Registro de clicks con tracking completo
- ✅ Descuento automático de créditos por impresión
- ✅ Registro de transacciones en historial
- ✅ Actualización de métricas en tiempo real (impresiones, clicks, CTR)
- ✅ Manejo de ubicación opcional (solo si tiene coordenadas válidas)
- ✅ Validación GeoJSON para datos geoespaciales

**Founder Dashboard:**
- ✅ Vista de todas las campañas activas
- ✅ Métricas globales (ingresos, impresiones totales)
- ✅ Sistema de aprobación/rechazo de campañas
- ✅ Filtros por estado y búsqueda
- ⏳ Configuración de precios de créditos - PENDIENTE

**Client Dashboard:**
- ✅ Vista de mis campañas con tabla completa
- ✅ Estadísticas en tiempo real (impresiones, clicks, CTR, créditos gastados)
- ✅ Balance de créditos visible y actualizado
- ✅ Pausar/Reanudar campañas
- ✅ Eliminar campañas en borrador
- ✅ Visualización de métricas por campaña
- ✅ Corrección de acceso a datos del API (fix: campaignsRes.data → campaignsRes)
- ✅ Crear nueva campaña (formulario completo de 5 pasos)
- ⏳ Editar campaña existente - PENDIENTE
- ⏳ Comprar créditos (integración de pago) - PENDIENTE
- ⏳ Ver historial de transacciones - PENDIENTE

**Navegación:**
- ✅ Link "🎯 Publicidad" en ProfileDropdown del Navbar
- ✅ Redireccionamiento basado en rol (cliente → `/publicidad`, founder → `/admin/publicidad`)
- ✅ Rutas agregadas al router
- ✅ Diseño destacado con gradiente para el link de publicidad

**Testing:**
- ✅ Script `createTestAd.js` para crear anuncios de prueba
- ✅ Script `deleteTestAd.js` para limpiar datos de prueba
- ✅ Verificación end-to-end del sistema de tracking
- ✅ Validación de descuento de créditos (1000 → 993 DegaCoins)

### ✅ Fase 5: Formulario de Creación de Campañas - COMPLETADO
**Formulario de Creación de Campaña:**
- ✅ Formulario multi-paso (5 pasos) con stepper visual
- ✅ Paso 1: Información básica (nombre, CTA, link destino)
- ✅ Paso 2: Imagen del anuncio (URL con preview en tiempo real)
- ✅ Paso 3: Segmentación (edad, género, intereses, ubicación)
- ✅ Paso 4: Configuración (fechas, presupuesto, prioridad, max impresiones)
- ✅ Paso 5: Preview completo con resumen de configuración
- ✅ Validaciones en cada paso
- ✅ Navegación anterior/siguiente
- ✅ Integración con dashboard
- ✅ Submit al backend y refresh automático
- ⏳ Upload de archivo de imagen (actualmente solo URL) - PENDIENTE

### ✅ Fase 6: Estadísticas Detalladas - COMPLETADO
**Página de Analytics:**
- ✅ Página de analytics por campaña (`/publicidad/analytics/:campaignId`)
- ✅ Métricas mejoradas con contexto (CPC, usuarios alcanzados, evaluación de rendimiento)
- ✅ Panel de análisis de rendimiento (tasa de conversión, presupuesto restante, días activos)
- ✅ Gráficas de tendencias con Recharts (impresiones y clicks por día)
- ✅ Distribución de dispositivos (Pie chart)
- ✅ Distribución de navegadores (Bar chart)
- ✅ Distribución geográfica (lista de ciudades)
- ✅ Tabla de eventos recientes (últimas impresiones y clicks)
- ✅ Filtros de fecha para análisis de períodos específicos
- ✅ Navegación desde dashboard con botón de estadísticas

**Pendiente:**
- ⏳ Exportación de reportes en PDF/CSV
- ⏳ Análisis de horarios de mayor engagement (heatmap)
- ⏳ Comparación entre múltiples campañas

### ⏳ Fase 7: Sistema de Pagos - PENDIENTE

---

## 🔧 Cambios Necesarios en el Código Actual

### 1. Renombrar Componente Frontend
```javascript
// Antes: AdsSidebar.jsx
// Después: AdsSidebar.jsx
```

### 2. Extender Modelo UserV2
```javascript
// Archivo: models/User.model.js
// Agregar al schema existente:

perfilPublicitario: {
  // Intereses inferidos automáticamente
  intereses: [String], // ['religión', 'deportes', 'tecnología']
  
  // Ubicación (con consentimiento)
  ubicacion: {
    ciudad: String,
    pais: String,
    coordenadas: {
      type: { type: String, default: 'Point' },
      coordinates: [Number] // [lng, lat]
    },
    consentimientoUbicacion: { type: Boolean, default: false }
  },
  
  // Preferencias de publicidad
  consentimientoPublicidad: { type: Boolean, default: true },
  publicidadPersonalizada: { type: Boolean, default: true }
},

// AGREGAR CAMPO FALTANTE:
genero: {
  type: String,
  enum: ['masculino', 'femenino', 'otro', 'prefiero_no_decir'],
  required: false
}
```

### 3. Crear Modelo Ad (Anuncio)
```javascript
// Nuevo archivo: models/Ad.js

const AdSchema = new mongoose.Schema({
  // Información del Cliente
  clienteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserV2',
    required: true 
  },
  nombreCliente: { type: String, required: true },
  
  // Contenido del Anuncio
  imagenUrl: { type: String, required: true },
  linkDestino: { type: String, required: true },
  textoAlternativo: { type: String },
  callToAction: { type: String, default: 'Ver más' },
  
  // Estado de la Campaña
  estado: { 
    type: String, 
    enum: ['borrador', 'activo', 'pausado', 'finalizado', 'sin_creditos'], 
    default: 'borrador' 
  },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  
  // Segmentación (Targeting)
  segmentacion: {
    // Edad
    edadMin: { type: Number, default: 13 },
    edadMax: { type: Number, default: 65 },
    
    // Género
    genero: { 
      type: String, 
      enum: ['todos', 'masculino', 'femenino', 'otro'], 
      default: 'todos' 
    },
    
    // Intereses
    intereses: [String], // ['religión', 'lectura', 'tecnología']
    
    // Geolocalización
    ubicacion: {
      type: { type: String, default: 'Point' },
      coordinates: [Number], // [lng, lat] del negocio
      radioKm: { type: Number, default: 50 }, // Alcance en kilómetros
      esGlobal: { type: Boolean, default: false } // Si es true, ignora ubicación
    }
  },
  
  // Sistema de Prioridad
  prioridad: {
    type: String,
    enum: ['basica', 'premium', 'destacada'],
    default: 'basica'
  },
  
  // Control de Frecuencia
  maxImpresionesUsuario: { type: Number, default: 3 }, // Máx veces que un usuario ve este anuncio
  
  // Métricas
  metricas: {
    impresiones: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 } // Click-Through Rate (calculado)
  },
  
  // Sistema de Créditos
  creditosGastados: { type: Number, default: 0 },
  costoPorImpresion: { type: Number, default: 1 }, // 1 DegaCoin por impresión
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice geoespacial para búsquedas por ubicación
AdSchema.index({ 'segmentacion.ubicacion': '2dsphere' });

// Middleware para calcular CTR antes de guardar
AdSchema.pre('save', function(next) {
  if (this.metricas.impresiones > 0) {
    this.metricas.ctr = (this.metricas.clicks / this.metricas.impresiones) * 100;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Ad', AdSchema);
```

### 4. Crear Modelo AdCredit (Créditos)
```javascript
// Nuevo archivo: models/AdCredit.js

const AdCreditSchema = new mongoose.Schema({
  clienteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserV2',
    required: true,
    unique: true // Un solo balance por cliente
  },
  
  balance: { type: Number, default: 0 }, // DegaCoins disponibles
  totalComprado: { type: Number, default: 0 }, // Total histórico comprado
  totalGastado: { type: Number, default: 0 }, // Total histórico gastado
  
  ultimaRecarga: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdCredit', AdCreditSchema);
```

### 5. Crear Modelo CreditTransaction (Historial)
```javascript
// Nuevo archivo: models/CreditTransaction.js

const CreditTransactionSchema = new mongoose.Schema({
  clienteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserV2',
    required: true
  },
  
  tipo: {
    type: String,
    enum: ['compra', 'gasto', 'bono', 'reembolso'],
    required: true
  },
  
  cantidad: { type: Number, required: true }, // Positivo para compra, negativo para gasto
  balanceAnterior: { type: Number, required: true },
  balanceNuevo: { type: Number, required: true },
  
  // Si es compra
  montoPagado: { type: Number }, // En USD o tu moneda
  metodoPago: { type: String }, // 'stripe', 'paypal', etc.
  
  // Si es gasto
  anuncioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ad'
  },
  
  descripcion: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);
```

### 6. Crear Modelo AdImpression (Registro de Vistas)
```javascript
// Nuevo archivo: models/AdImpression.js

const AdImpressionSchema = new mongoose.Schema({
  anuncioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ad',
    required: true
  },
  
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserV2',
    required: true
  },
  
  // Metadata para análisis
  dispositivo: { type: String }, // 'mobile', 'desktop', 'tablet'
  navegador: { type: String },
  ubicacion: {
    ciudad: String,
    pais: String
  },
  
  timestamp: { type: Date, default: Date.now }
});

// Índice compuesto para evitar contar la misma impresión múltiples veces
AdImpressionSchema.index({ anuncioId: 1, usuarioId: 1, timestamp: 1 });

module.exports = mongoose.model('AdImpression', AdImpressionSchema);
```

---

## 🚀 Endpoints del Backend

### Endpoints para Usuarios (Ver Anuncios)
```javascript
POST /api/ads/recommendations
// Body: { userId, location? }
// Retorna: Array de anuncios segmentados para ese usuario

POST /api/ads/impression/:adId
// Registra que el usuario vio el anuncio
// Descuenta 1 crédito del balance del cliente

POST /api/ads/click/:adId
// Registra que el usuario hizo click
```

### Endpoints para Clientes (Gestionar Campañas)
```javascript
// Campañas
GET /api/ads/my-campaigns
POST /api/ads/create
PUT /api/ads/:id
DELETE /api/ads/:id
GET /api/ads/:id/stats

// Créditos
GET /api/ads/credits/balance
POST /api/ads/credits/purchase
GET /api/ads/credits/transactions
```

### Endpoints para Founder (Admin)
```javascript
GET /api/ads/admin/all-campaigns
GET /api/ads/admin/clients
GET /api/ads/admin/revenue
PUT /api/ads/admin/approve/:adId
```

---

## 📊 Flujo de Trabajo Completo

### Para el Cliente (Librería Cristiana)
1. Se registra en la plataforma como "Anunciante"
2. Compra 1000 DegaCoins por $50
3. Crea una campaña:
   - Sube imagen de la Biblia
   - Configura: Edad 18-60, Interés: Religión, Radio: 10km
4. Activa la campaña
5. Ve en tiempo real: 250 impresiones, 15 clicks, CTR: 6%
6. Cuando llega a 0 créditos, recibe alerta para recargar

### Para el Usuario Final (Carlos)
1. Entra al Home
2. El sidebar carga automáticamente
3. Ve el anuncio de la Biblia (porque cumple el targeting)
4. Hace click → Abre la tienda en nueva pestaña
5. La próxima vez que entre, verá otro anuncio (rotación)

### Para ti (Founder)
1. Dashboard con métricas globales
2. Apruebas/rechazas campañas nuevas
3. Ves ingresos totales
4. Gestionas precios de paquetes de créditos

---

## 🔐 Consideraciones de Privacidad (GDPR/CCPA)

### Consentimientos Necesarios
```javascript
// Al registrarse o en Configuración:
{
  "Acepto recibir publicidad personalizada": true/false,
  "Permito usar mi ubicación para anuncios locales": true/false,
  "Permito que se analicen mis intereses": true/false
}
```

### Página de Preferencias de Publicidad
```
/configuracion/publicidad
- [ ] Recibir anuncios personalizados
- [ ] Usar mi ubicación
- [ ] Inferir mis intereses
- [Botón] Ver qué datos se usan
- [Botón] Descargar mis datos publicitarios
```

---

## 📈 Métricas Clave a Trackear

### Por Anuncio
- Impresiones totales
- Clicks totales
- CTR (Click-Through Rate)
- Créditos gastados
- Usuarios únicos alcanzados

### Globales (Founder)
- Ingresos totales por venta de créditos
- Anuncios activos
- Clientes activos
- Impresiones totales de la plataforma

---

## 🎨 Componentes Frontend a Crear

### Usuario Final
- `AdsSidebar.jsx` - Sidebar con anuncios
- `AdCard.jsx` - Tarjeta individual de anuncio

### Cliente Anunciante
- `CampaignDashboard.jsx` - Panel principal
- `CreateCampaign.jsx` - Formulario de creación
- `CampaignStats.jsx` - Estadísticas detalladas
- `BuyCredits.jsx` - Compra de DegaCoins

### Founder
- `AdminAdsDashboard.jsx` - Vista general
- `ClientManagement.jsx` - Gestión de clientes
- `RevenueReport.jsx` - Reportes financieros

---

## ⏱️ Estimación de Tiempo de Desarrollo

### Fase 1: Fundamentos (2-3 semanas)
- Modelos de datos
- Endpoints básicos
- AdsSidebar funcional

### Fase 2: Sistema de Créditos (1-2 semanas)
- Integración de pagos (Stripe/PayPal)
- Sistema de descuento automático
- Alertas de saldo

### Fase 3: Segmentación Avanzada (2 semanas)
- Inferencia de intereses
- Geolocalización
- Rotación inteligente

### Fase 4: Dashboards (2-3 semanas)
- Panel de cliente
- Panel de founder
- Reportes y gráficas

**Total estimado: 7-10 semanas** (trabajando de forma constante)

---

## 🎯 Próximos Pasos Inmediatos

1. ✅ ~~Agregar campo `genero` al registro de usuarios~~ (Ya existía en el modelo)
2. ✅ Crear modelos en el backend (Ad, AdCredit, CreditTransaction, AdImpression)
3. ✅ Renombrar `QuickSearch.jsx` a `AdsSidebar.jsx`
4. ✅ Implementar endpoint `/api/ads/recommendations` (17 endpoints totales)
5. ✅ Crear componente `AdCard.jsx`
6. ✅ Integrar AdCard en AdsSidebar con tracking automático
7. ⏳ **SIGUIENTE:** Probar con anuncio de prueba
8. ⏳ **SIGUIENTE:** Crear dashboards de cliente y founder

---

## 📝 Estado Actual del Proyecto

### ✅ COMPLETADO (2025-12-12)

#### Backend - Modelos
- ✅ Modelo `UserV2` extendido con `perfilPublicitario`
  - Intereses inferidos
  - Ubicación con consentimiento
  - Preferencias de publicidad (GDPR/CCPA)
  - Historial de anuncios vistos
- ✅ Modelo `Ad.js` creado con segmentación completa
  - Targeting por edad, género, intereses, ubicación
  - Sistema de prioridad (básica/premium/destacada)
  - Control de frecuencia de impresión
  - Métricas (impresiones, clicks, CTR)
- ✅ Modelo `AdCredit.js` creado con sistema de DegaCoins
  - Balance de créditos
  - Alertas de saldo bajo
  - Métodos para agregar/descontar créditos
- ✅ Modelo `CreditTransaction.js` creado para historial
  - Registro de compras, gastos, bonos, reembolsos
  - Métodos de analytics
- ✅ Modelo `AdImpression.js` creado para tracking
  - Registro de vistas y clicks
  - Metadata de dispositivo y ubicación
  - Métodos de estadísticas y distribución geográfica

#### Backend - API (17 Endpoints)
- ✅ **Usuarios (Ver Anuncios):**
  - `POST /api/ads/recommendations` - Algoritmo de recomendación inteligente
  - `POST /api/ads/impression/:adId` - Registrar vista (descuenta créditos automáticamente)
  - `POST /api/ads/click/:adId` - Registrar click
- ✅ **Clientes (Gestionar Campañas):**
  - `GET /api/ads/my-campaigns` - Ver mis campañas
  - `POST /api/ads/create` - Crear campaña (requiere aprobación)
  - `PUT /api/ads/:id` - Editar campaña
  - `PATCH /api/ads/:id/toggle` - Pausar/Reanudar
  - `DELETE /api/ads/:id` - Eliminar
  - `GET /api/ads/:id/stats` - Estadísticas detalladas
- ✅ **Sistema de Créditos:**
  - `GET /api/ads/credits/balance` - Ver balance
  - `POST /api/ads/credits/purchase` - Comprar DegaCoins
  - `GET /api/ads/credits/transactions` - Historial
- ✅ **Admin (Founder):**
  - `GET /api/ads/admin/all-campaigns` - Ver todas las campañas
  - `PUT /api/ads/admin/approve/:adId` - Aprobar/Rechazar
  - `GET /api/ads/admin/revenue` - Ingresos totales
  
#### Solución de Errores y Debugging
- ✅ Validación GeoJSON para campañas globales corregida
- ✅ Permisos de Founder y visibilidad de dashboard corregidos
- ✅ Bug de frontend en parseo de respuesta corregido
- ✅ Scripts de utilidad creados (`makeFounder.js`, `testApiEndpoint.js`)
- ✅ Endpoint `checkRoles.js` para auditoría

#### Frontend - Componentes
- ✅ Componente `AdsSidebar.jsx` renombrado correctamente
  - Fetch automático de anuncios personalizados
  - Solicitud opcional de geolocalización
  - Estados de loading y error
  - UI moderna con dark mode
- ✅ Componente `AdCard.jsx` creado
  - Tracking automático de impresiones (Intersection Observer)
  - Tracking de clicks con device info
  - Diseño moderno con gradientes
  - Hover effects y animaciones

### ⏳ SIGUIENTE FASE: Dashboards y Testing

#### Próximas Tareas Prioritarias
1. ✅ ~~Crear anuncio de prueba en la base de datos~~ (Scripts funcionales)
2. ✅ ~~Probar flujo completo~~ (Tracking y descuento verificados)
3. ✅ ~~Dashboard de Cliente~~ (Creación y visualización funcional)
4. ✅ ~~Dashboard de Founder~~ (Aprobación y listado verificado)
5. ⏳ Integración con Stripe/PayPal para compra real de créditos
6. ⏳ Sistema de inferencia de intereses basado en actividad del usuario

---

**Documento creado:** 2025-12-11
**Última actualización:** 2025-12-12 08:47
