const User = require('../models/User.model');
const Friendship = require('../models/Friendship.model');
const mongoose = require('mongoose');
const redis = require('./redis.service');
const logger = require('../config/logger');

const CACHE_TTL = 60; // 60 segundos de cache

/**
 * Mapeo de niveles jerárquicos para comparación eficiente.
 */
const NIVELES_MAP = {
  "directivo_general": 0,
  "organo_control": 1,
  "organismo_internacional": 2,
  "nacional": 3,
  "regional": 4,
  "departamental": 5,
  "municipal": 6,
  "local": 7,
  "barrial": 8
};

const NIVELES_FUNDACION = Object.keys(NIVELES_MAP);

/**
 * Borrar el cache de recomendaciones de un usuario específico
 */
const clearRecommendationCache = async (userId) => {
  try {
    const keys = await redis.client.keys(`recs:${userId}:*`);
    if (keys.length > 0) {
      await redis.client.del(...keys);
      logger.info(`🧹 Cache de recomendaciones limpiado para usuario: ${userId}`);
    }
  } catch (err) {
    logger.error(`❌ Error al limpiar cache de recomendaciones: ${err.message}`);
  }
};

/**
 * Obtener IDs a excluir (relaciones existentes)
 * LIMITAMOS el select para ser ultra ligero
 */
const getExcludedUserIds = async (userId) => {
  const relations = await Friendship.find({
    $or: [{ solicitante: userId }, { receptor: userId }]
  }).select('solicitante receptor -_id').lean();

  const excludedIds = new Set();
  excludedIds.add(userId.toString());

  relations.forEach(rel => {
    excludedIds.add(rel.solicitante.toString());
    excludedIds.add(rel.receptor.toString());
  });

  return excludedIds;
};

/**
 * UNIFICADO: Obtener recomendaciones filtrando en memoria para evitar $nin gigante
 */
const getRecommendedUsers = async (userId, limit = 10, clientExcludedIds = []) => {
  const cacheKey = `recs:${userId}:${limit}:${clientExcludedIds.length}`;
  
  // 1. Intentar hit de Cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn(`⚠️ Redis error en recs: ${err.message}`);
  }

  // 2. Cargar usuario y sus exclusiones
  const user = await User.findById(userId).select('fundacion personal').lean();
  if (!user) throw new Error('Usuario no encontrado');

  const excludedSet = await getExcludedUserIds(userId);
  clientExcludedIds.forEach(id => excludedSet.add(id.toString()));

  let recommendations = [];
  const userCountry = user.fundacion?.territorio?.pais || user.personal?.ubicacion?.pais;

  // --- FASE 1: Jerarquía Unificada ---
  if (user.esMiembroFundacion && user.fundacion?.nivel) {
    const userLevelValue = NIVELES_MAP[user.fundacion.nivel];
    if (userLevelValue !== undefined && userLevelValue > 0) {
      const superiorLevels = NIVELES_FUNDACION.slice(0, userLevelValue);
      
      // Query unificada con Pais + Niveles
      const hierarchyCandidates = await User.find({
        "fundacion.nivel": { $in: superiorLevels },
        "fundacion.territorio.pais": userCountry,
        "fundacion.estadoAprobacion": "aprobado",
        "seguridad.estadoCuenta": "activo"
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('nombres apellidos social fundacion personal')
      .lean();

      // Filtrado en memoria
      const filteredHierarchy = hierarchyCandidates.filter(u => !excludedSet.has(u._id.toString()));
      recommendations.push(...filteredHierarchy);
    }
  }

  // --- FASE 2: Relevancia Unificada (Si falta cupo) ---
  if (recommendations.length < limit) {
    const relevanceCandidates = await User.find({
      "seguridad.estadoCuenta": "activo",
      "personal.ubicacion.pais": userCountry
    })
    .sort({ "social.stats.seguidores": -1, "seguridad.ultimaConexion": -1 })
    .limit(100)
    .select('nombres apellidos social fundacion personal')
    .lean();

    const filteredRelevance = relevanceCandidates.filter(u => 
      !excludedSet.has(u._id.toString()) && 
      !recommendations.some(r => r._id.toString() === u._id.toString())
    );
    recommendations.push(...filteredRelevance);
  }

  // --- FASE 3: Descubrimiento ALEATORIO (Último recurso) ---
  if (recommendations.length < limit) {
    // Usamos limit 50 para el aggregate para no matar la DB
    const discoveryCandidates = await User.aggregate([
      { $match: { "seguridad.estadoCuenta": "activo" } },
      { $sample: { size: 50 } },
      { $project: { nombres: 1, apellidos: 1, social: 1, fundacion: 1, personal: 1 } }
    ]).exec();

    const filteredDiscovery = discoveryCandidates.filter(u => 
      !excludedSet.has(u._id.toString()) && 
      !recommendations.some(r => r._id.toString() === u._id.toString())
    );
    recommendations.push(...filteredDiscovery);
  }

  // 3. Limitar y Formatear
  const finalResult = recommendations.slice(0, limit).map(u => ({
    ...u,
    _id: u._id,
    name: `${u.nombres?.primero || ''} ${u.apellidos?.primero || ''}`.trim() || 'Usuario Degader',
    country: u.fundacion?.territorio?.pais || u.personal?.ubicacion?.pais || 'Global',
    role: u.fundacion?.cargo || u.fundacion?.nivel || 'Miembro',
    social: u.social || {},
    nombres: u.nombres || {},
    apellidos: u.apellidos || {},
    fundacion: u.fundacion || {},
    personal: u.personal || {}
  }));

  // 4. Guardar en Cache
  try {
    await redis.set(cacheKey, finalResult, CACHE_TTL);
  } catch (err) {
    logger.warn(`❌ No se pudo cachear recs: ${err.message}`);
  }

  return finalResult;
};

module.exports = {
  getRecommendedUsers,
  clearRecommendationCache
};
