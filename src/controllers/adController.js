const Ad = require('../models/Ad');
const AdCredit = require('../models/AdCredit');
const CreditTransaction = require('../models/CreditTransaction');
const AdImpression = require('../models/AdImpression');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const UserV2 = require('../models/User.model');

/**
 * ==========================================
 * ENDPOINTS PARA USUARIOS (VER ANUNCIOS)
 * ==========================================
 */

/**
 * Obtener anuncios recomendados para el usuario actual
 * POST /api/ads/recommendations
 */
/**
 * Obtener anuncios recomendados para el usuario actual
 * POST /api/ads/recommendations
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.userId; // Del middleware de autenticación
    const { location } = req.body; // Ubicación opcional del frontend

    // 1. Obtener perfil del usuario con su historial de anuncios vistos
    const user = await UserV2.findById(userId).select('personal perfilPublicitario');

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // 2. Calcular edad del usuario
    let edad = null;
    if (user.personal?.fechaNacimiento) {
      const birthDate = new Date(user.personal.fechaNacimiento);
      const today = new Date();
      edad = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // 3. Construir query de filtrado
    const now = new Date();
    const query = {
      estado: 'activo',
      fechaInicio: { $lte: now },
      fechaFin: { $gte: now }
    };

    // Filtro de edad (si tenemos la edad del usuario)
    if (edad !== null) {
      query['segmentacion.edadMin'] = { $lte: edad };
      query['segmentacion.edadMax'] = { $gte: edad };
    }

    // Filtro de género
    const genero = user.personal?.genero;
    if (genero) {
      query.$or = [
        { 'segmentacion.genero': 'todos' },
        { 'segmentacion.genero': genero }
      ];
    } else {
      query['segmentacion.genero'] = 'todos';
    }

    // 4. Buscar anuncios candidatos (limitamos a 50 para filtrar en memoria)
    let anuncios = await Ad.find(query)
      .sort({ prioridad: -1, createdAt: -1 })
      .limit(50);

    // 5. Filtrar y ordenar en memoria (Intelligent Rotation)
    const anunciosVistosMap = new Map();
    if (user.perfilPublicitario?.anunciosVistos) {
      user.perfilPublicitario.anunciosVistos.forEach(v => {
        anunciosVistosMap.set(v.anuncioId.toString(), {
          vecesVisto: v.vecesVisto,
          ultimaVista: new Date(v.ultimaVista)
        });
      });
    }

    const anunciosFiltrados = [];
    const minTimeBetweenViews = 10 * 60 * 1000; // 10 minutos para no spamear el mismo anuncio

    for (const anuncio of anuncios) {
      const historial = anunciosVistosMap.get(anuncio._id.toString());

      // Regla 1: Respetar límite máximo de impresiones por usuario
      if (historial && historial.vecesVisto >= anuncio.maxImpresionesUsuario) {
        continue;
      }

      // Regla 2: No mostrar si se vio muy recientemente (ej. hace menos de 10 min)
      if (historial && (now - historial.ultimaVista) < minTimeBetweenViews) {
        continue;
      }

      anuncio.score = 0;

      // Scoring: Prioridad declarada
      if (anuncio.prioridad === 'destacada') anuncio.score += 50;
      if (anuncio.prioridad === 'premium') anuncio.score += 20;

      // Scoring: Menos visto = mejor
      const vecesVisto = historial ? historial.vecesVisto : 0;
      anuncio.score -= (vecesVisto * 10); // Penalizar si ya se vio

      // Scoring: Intereses coincidentes
      if (user.perfilPublicitario?.intereses?.length > 0) {
        const interesesUsuario = user.perfilPublicitario.intereses;
        const matchCount = anuncio.segmentacion.intereses?.filter(i => interesesUsuario.includes(i)).length || 0;
        anuncio.score += (matchCount * 5);
      }

      anunciosFiltrados.push(anuncio);
    }

    // Ordenar por score descendente
    anunciosFiltrados.sort((a, b) => b.score - a.score);

    // 6. Si el usuario no acepta publicidad personalizada, solo mostrar anuncios globales
    let resultados = anunciosFiltrados;
    if (user.perfilPublicitario?.publicidadPersonalizada === false) {
      resultados = anunciosFiltrados.filter(ad => ad.segmentacion.ubicacion?.esGlobal === true);
    }

    // Devolver top 3
    res.json(resultados.slice(0, 3));

  } catch (error) {
    console.error('❌ Error obteniendo recomendaciones:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Registrar impresión (vista) de un anuncio
 * POST /api/ads/impression/:adId
 */
exports.registerImpression = async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.userId;

    // 1. Verificar que el anuncio existe y está activo
    const ad = await Ad.findById(adId);

    if (!ad || !ad.estaActivo()) {
      return res.status(404).json({ msg: 'Anuncio no encontrado o inactivo' });
    }

    // 2. Verificar que el cliente tiene créditos
    const balance = await AdCredit.findOne({ clienteId: ad.clienteId });

    if (!balance || balance.balance < ad.costoPorImpresion) {
      // Pausar campaña automáticamente
      ad.estado = 'sin_creditos';
      await ad.save();
      return res.status(402).json({ msg: 'Campaña pausada por falta de créditos' });
    }

    // 3. Registrar la impresión (Analytics Globales)
    const impresionData = {
      anuncioId: adId,
      usuarioId: userId,
      dispositivo: req.body.dispositivo || 'unknown',
      navegador: req.body.navegador,
      sistemaOperativo: req.body.sistemaOperativo,
      paginaOrigen: req.body.paginaOrigen
    };

    if (req.body.ubicacion?.coordenadas?.coordinates?.length === 2) {
      impresionData.ubicacion = req.body.ubicacion;
    }

    await AdImpression.registrarVista(impresionData);

    // 4. Actualizar historial del usuario (Intelligent Rotation)
    // Usamos updateOne para ser atómicos y eficientes
    try {
      const userUpdateResult = await UserV2.updateOne(
        { _id: userId, 'perfilPublicitario.anunciosVistos.anuncioId': adId },
        {
          $inc: { 'perfilPublicitario.anunciosVistos.$.vecesVisto': 1 },
          $set: { 'perfilPublicitario.anunciosVistos.$.ultimaVista': new Date() }
        }
      );

      // Si no se actualizó nada, significa que no existía el registro, hacemos push
      if (userUpdateResult.modifiedCount === 0) {
        await UserV2.updateOne(
          { _id: userId },
          {
            $push: {
              'perfilPublicitario.anunciosVistos': {
                anuncioId: adId,
                vecesVisto: 1,
                ultimaVista: new Date()
              }
            }
          }
        );
      }
    } catch (histErr) {
      console.error('⚠️ Error actualizando historial de usuario (no bloqueante):', histErr);
    }

    // 5. Descontar crédito del balance
    await balance.descontarCreditos(ad.costoPorImpresion);

    // 6. Registrar transacción
    await CreditTransaction.create({
      clienteId: ad.clienteId,
      tipo: 'gasto',
      cantidad: -ad.costoPorImpresion,
      balanceAnterior: balance.balance + ad.costoPorImpresion,
      balanceNuevo: balance.balance,
      anuncioId: adId,
      impresionesGeneradas: 1,
      descripcion: `Impresión de anuncio: ${ad.nombreCliente} `
    });

    // 7. Actualizar créditos gastados en el anuncio
    ad.creditosGastados += ad.costoPorImpresion;
    await ad.save();

    res.json({ msg: 'Impresión registrada', creditosRestantes: balance.balance });

  } catch (error) {
    console.error('❌ Error registrando impresión:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Registrar click en un anuncio
 * POST /api/ads/click/:adId
 */
exports.registerClick = async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.userId;

    // 1. Verificar que el anuncio existe
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ msg: 'Anuncio no encontrado' });
    }

    // 2. Registrar el click
    const clickData = {
      anuncioId: adId,
      usuarioId: userId,
      dispositivo: req.body.dispositivo || 'unknown',
      navegador: req.body.navegador,
      sistemaOperativo: req.body.sistemaOperativo,
      paginaOrigen: req.body.paginaOrigen
    };

    // Solo agregar ubicacion si tiene coordenadas válidas
    if (req.body.ubicacion?.coordenadas?.coordinates?.length === 2) {
      clickData.ubicacion = req.body.ubicacion;
    }

    await AdImpression.registrarClick(clickData);

    res.json({ msg: 'Click registrado' });

  } catch (error) {
    console.error('❌ Error registrando click:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * ==========================================
 * ENDPOINTS PARA CLIENTES (GESTIONAR CAMPAÑAS)
 * ==========================================
 */

/**
 * Obtener campañas del cliente actual
 * GET /api/ads/my-campaigns
 */
exports.getMyCampaigns = async (req, res) => {
  try {
    const clienteId = req.userId;

    const campaigns = await Ad.find({ clienteId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json(campaigns);

  } catch (error) {
    console.error('❌ Error obteniendo campañas:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Crear nueva campaña
 * POST /api/ads/create
 */
exports.createCampaign = async (req, res) => {
  try {
    console.log('📝 Creando campaña - Body recibido:', JSON.stringify(req.body, null, 2));

    const clienteId = req.userId;
    const {
      nombreCliente,
      imagenUrl,
      linkDestino,
      textoAlternativo,
      callToAction,
      fechaInicio,
      fechaFin,
      segmentacion,
      prioridad,
      maxImpresionesUsuario,
      costoPorImpresion
    } = req.body;

    // Validaciones básicas
    if (!nombreCliente || !imagenUrl || !linkDestino || !fechaInicio || !fechaFin) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({ msg: 'Faltan campos requeridos' });
    }

    console.log('✅ Validaciones básicas pasadas');
    console.log('📊 Segmentación recibida:', JSON.stringify(segmentacion, null, 2));

    // Verificar si el usuario es founder para auto-aprobar
    const user = await UserV2.findById(clienteId).select('seguridad.rolSistema'); // Modificado para check correcto
    const isFounder = user?.seguridad?.rolSistema === 'Founder';
    const estadoInicial = isFounder ? 'activo' : 'pendiente_aprobacion';

    console.log(`👤 Usuario rol: ${user?.rol}, Estado inicial: ${estadoInicial} `);

    // Preparar segmentación - si es global, no incluir ubicacion
    const segmentacionData = {
      edadMin: segmentacion?.edadMin || 18,
      edadMax: segmentacion?.edadMax || 65,
      genero: segmentacion?.genero || 'todos',
      intereses: segmentacion?.intereses || []
    };

    // Solo agregar ubicacion si NO es global y tiene coordenadas
    if (segmentacion?.ubicacion && !segmentacion.ubicacion.esGlobal && segmentacion.ubicacion.coordinates) {
      segmentacionData.ubicacion = {
        type: 'Point',
        coordinates: segmentacion.ubicacion.coordinates,
        radioKm: segmentacion.ubicacion.radioKm || 50,
        esGlobal: false
      };
    }

    console.log('📊 Segmentación procesada:', JSON.stringify(segmentacionData, null, 2));

    // Crear el anuncio
    const newAd = new Ad({
      clienteId,
      nombreCliente,
      imagenUrl,
      linkDestino,
      textoAlternativo,
      callToAction,
      estado: estadoInicial,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      segmentacion: segmentacionData,
      prioridad: prioridad || 'basica',
      maxImpresionesUsuario: maxImpresionesUsuario || 3,
      costoPorImpresion: costoPorImpresion || 1
    });

    console.log('💾 Intentando guardar anuncio...');
    await newAd.save();
    console.log('✅ Anuncio guardado exitosamente');

    // ----------------------------------------------------
    // NOTIFICACIÓN AL FOUNDER
    // ----------------------------------------------------
    try {
      if (!isFounder) {
        // Buscar al Founder
        const founderUser = await UserV2.findOne({ 'seguridad.rolSistema': 'Founder' });

        if (founderUser) {
          console.log(`🔔 Enviando notificación a Founder: ${founderUser._id} `);

          const notificacion = await Notification.create({
            emisor: clienteId,
            receptor: founderUser._id,
            tipo: 'nuevo_anuncio',
            contenido: 'quiere generar un nuevo anuncio!',
            referencia: {
              tipo: 'Ad',
              id: newAd._id
            },
            leida: false
          });

          // Popular para socket
          const notificacionPopulada = await Notification.findById(notificacion._id)
            .populate('emisor', 'nombres apellidos social.fotoPerfil username')
            .populate('referencia.id', 'nombreCliente imagenUrl');

          // Emitir evento Socket.IO
          const io = req.app.get('io');
          if (io) {
            io.to(`notifications:${founderUser._id}`).emit('newNotification', notificacionPopulada);
            console.log('📡 Notificación emitida por Socket.IO');
          } else {
            console.log('⚠️ No se encontró instancia de IO');
          }
        }
      }
    } catch (notifError) {
      console.error('❌ Error enviando notificación:', notifError);
      // No bloqueamos la respuesta si falla la notificación
    }

    const mensaje = isFounder
      ? 'Campaña creada y activada exitosamente.'
      : 'Campaña creada exitosamente. Pendiente de aprobación.';

    res.status(201).json({
      msg: mensaje,
      campaign: newAd
    });

  } catch (error) {
    console.error('❌ Error creando campaña:', error);
    console.error('Stack completo:', error.stack);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Actualizar campaña
 * PUT /api/ads/:id
 */
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteId = req.userId;

    // Verificar que la campaña pertenece al cliente
    const ad = await Ad.findOne({ _id: id, clienteId });
    if (!ad) {
      return res.status(404).json({ msg: 'Campaña no encontrada' });
    }

    // No permitir editar campañas activas (solo borradores o pausadas)
    if (ad.estado === 'activo') {
      return res.status(400).json({ msg: 'No se puede editar una campaña activa. Pausala primero.' });
    }

    // Actualizar campos permitidos
    const allowedUpdates = [
      'nombreCliente', 'imagenUrl', 'linkDestino', 'textoAlternativo',
      'callToAction', 'fechaInicio', 'fechaFin', 'segmentacion',
      'prioridad', 'maxImpresionesUsuario'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        ad[field] = req.body[field];
      }
    });

    // Si se edita, volver a estado pendiente de aprobación
    if (ad.estado === 'rechazado') {
      ad.estado = 'pendiente_aprobacion';
      ad.motivoRechazo = undefined;
    }

    await ad.save();

    res.json({ msg: 'Campaña actualizada', campaign: ad });

  } catch (error) {
    console.error('❌ Error actualizando campaña:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Pausar/Reanudar campaña
 * PATCH /api/ads/:id/toggle
 */
exports.toggleCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteId = req.userId;

    const ad = await Ad.findOne({ _id: id, clienteId });
    if (!ad) {
      return res.status(404).json({ msg: 'Campaña no encontrada' });
    }

    // Toggle entre activo y pausado
    if (ad.estado === 'activo') {
      ad.estado = 'pausado';
    } else if (ad.estado === 'pausado') {
      ad.estado = 'activo';
    } else {
      return res.status(400).json({ msg: 'Solo se pueden pausar/reanudar campañas activas o pausadas' });
    }

    await ad.save();

    res.json({ msg: `Campaña ${ad.estado} `, campaign: ad });

  } catch (error) {
    console.error('❌ Error cambiando estado:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Eliminar campaña
 * DELETE /api/ads/:id
 */
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteId = req.userId;

    const ad = await Ad.findOne({ _id: id, clienteId });
    if (!ad) {
      return res.status(404).json({ msg: 'Campaña no encontrada' });
    }

    // Solo permitir eliminar borradores o rechazadas
    if (ad.estado === 'activo' || ad.estado === 'pausado') {
      return res.status(400).json({ msg: 'No se puede eliminar una campaña activa. Pausala primero.' });
    }

    await Ad.findByIdAndDelete(id);

    res.json({ msg: 'Campaña eliminada' });

  } catch (error) {
    console.error('❌ Error eliminando campaña:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Obtener estadísticas de una campaña
 * GET /api/ads/:id/stats
 */
exports.getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteId = req.userId;
    const { fechaInicio, fechaFin } = req.query;

    const ad = await Ad.findOne({ _id: id, clienteId });
    if (!ad) {
      return res.status(404).json({ msg: 'Campaña no encontrada' });
    }

    // Obtener estadísticas detalladas
    const stats = await AdImpression.obtenerEstadisticas(id, fechaInicio, fechaFin);

    // Obtener distribución geográfica
    const geoDistribution = await AdImpression.obtenerDistribucionGeografica(id);

    res.json({
      campaign: {
        nombre: ad.nombreCliente,
        estado: ad.estado,
        fechaInicio: ad.fechaInicio,
        fechaFin: ad.fechaFin,
        creditosGastados: ad.creditosGastados
      },
      metricas: ad.metricas,
      estadisticasDetalladas: stats,
      distribucionGeografica: geoDistribution
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * ==========================================
 * ENDPOINTS DE CRÉDITOS
 * ==========================================
 */

/**
 * Obtener balance de créditos
 * GET /api/ads/credits/balance
 */
exports.getBalance = async (req, res) => {
  try {
    const clienteId = req.userId;

    const balance = await AdCredit.obtenerOCrear(clienteId);

    res.json({
      balance: balance.balance,
      totalComprado: balance.totalComprado,
      totalGastado: balance.totalGastado,
      totalBonos: balance.totalBonos,
      alertaBajoBalance: balance.alertaBajoBalance,
      ultimaRecarga: balance.ultimaRecarga
    });

  } catch (error) {
    console.error('❌ Error obteniendo balance:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Comprar créditos (simulado - integrar con Stripe/PayPal después)
 * POST /api/ads/credits/purchase
 */
exports.purchaseCredits = async (req, res) => {
  try {
    const clienteId = req.userId;
    const { paquete, cantidad, montoPagado, metodoPago } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ msg: 'Cantidad inválida' });
    }

    // Obtener o crear balance
    const balance = await AdCredit.obtenerOCrear(clienteId);
    const balanceAnterior = balance.balance;

    // Agregar créditos
    await balance.agregarCreditos(cantidad, false);

    // Registrar transacción
    await CreditTransaction.create({
      clienteId,
      tipo: 'compra',
      cantidad,
      balanceAnterior,
      balanceNuevo: balance.balance,
      montoPagado: montoPagado || cantidad * 0.05, // $0.05 por crédito por defecto
      moneda: 'USD',
      metodoPago: metodoPago || 'stripe',
      paquete: paquete || 'personalizado',
      descripcion: `Compra de ${cantidad} DegaCoins`
    });

    res.json({
      msg: 'Créditos comprados exitosamente',
      balance: balance.balance,
      creditosAgregados: cantidad
    });

  } catch (error) {
    console.error('❌ Error comprando créditos:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Obtener historial de transacciones
 * GET /api/ads/credits/transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const clienteId = req.userId;
    const { limite = 50 } = req.query;

    const transactions = await CreditTransaction.obtenerHistorial(clienteId, parseInt(limite));

    res.json(transactions);

  } catch (error) {
    console.error('❌ Error obteniendo transacciones:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * ==========================================
 * ENDPOINTS PARA FOUNDER (ADMIN)
 * ==========================================
 */

/**
 * Obtener todas las campañas (admin)
 * GET /api/ads/admin/all-campaigns
 */
exports.getAllCampaigns = async (req, res) => {
  try {
    // Verificar que el usuario es Founder
    const user = await UserV2.findById(req.userId).select('seguridad.rolSistema');
    if (user?.seguridad?.rolSistema !== 'Founder') {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    const { estado, page = 1, limit = 20 } = req.query;
    const query = estado ? { estado } : {};

    const campaigns = await Ad.find(query)
      .populate('clienteId', 'nombres apellidos email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Ad.countDocuments(query);

    res.json({
      campaigns,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('❌ Error obteniendo campañas (admin):', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Aprobar/Rechazar campaña (admin)
 * PUT /api/ads/admin/approve/:adId
 */
exports.approveCampaign = async (req, res) => {
  try {
    // Verificar que el usuario es Founder
    const user = await UserV2.findById(req.userId).select('seguridad.rolSistema');
    if (user?.seguridad?.rolSistema !== 'Founder') {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    const { adId } = req.params;
    const { accion, motivoRechazo } = req.body; // accion: 'aprobar' o 'rechazar'

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ msg: 'Campaña no encontrada' });
    }

    if (accion === 'aprobar') {
      ad.estado = 'activo';
      ad.motivoRechazo = undefined;
    } else if (accion === 'rechazar') {
      ad.estado = 'rechazado';
      ad.motivoRechazo = motivoRechazo || 'No especificado';
    } else {
      return res.status(400).json({ msg: 'Acción inválida' });
    }

    await ad.save();

    res.json({ msg: `Campaña ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} `, campaign: ad });

  } catch (error) {
    console.error('❌ Error aprobando campaña:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

/**
 * Obtener ingresos totales (admin)
 * GET /api/ads/admin/revenue
 */
exports.getRevenue = async (req, res) => {
  try {
    // Verificar que el usuario es Founder
    const user = await UserV2.findById(req.userId).select('seguridad.rolSistema');
    if (user?.seguridad?.rolSistema !== 'Founder') {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    const revenue = await CreditTransaction.obtenerIngresostotales();

    // Obtener estadísticas adicionales
    const totalCampaigns = await Ad.countDocuments();
    const activeCampaigns = await Ad.countDocuments({ estado: 'activo' });
    const totalClients = await AdCredit.countDocuments();

    res.json({
      ingresos: revenue,
      estadisticas: {
        totalCampañas: totalCampaigns,
        campañasActivas: activeCampaigns,
        clientesActivos: totalClients
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo ingresos:', error);
    res.status(500).json({ msg: 'Error del servidor', error: error.message });
  }
};

module.exports = exports;
