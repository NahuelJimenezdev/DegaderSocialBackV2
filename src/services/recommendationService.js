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
  const cacheKey = `recs:v2:${userId}:${limit}:${clientExcludedIds.length}`;
  
  // 1. Intentar hit de Cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn(`⚠️ Redis error en recs: ${err.message}`);
  }

  // 2. Cargar usuario y relaciones
  const user = await User.findById(userId).select('_id').lean();
  if (!user) throw new Error('Usuario no encontrado');

  const excludedSet = await getExcludedUserIds(userId);
  clientExcludedIds.forEach(id => {
    if (id) excludedSet.add(id.toString());
  });

  // --- FASE ÚNICA: Totalmente Aleatorio Rápido (Evitar Timeout de $sample en Atlas M0) ---
  const totalUsers = await User.countDocuments();
  const maxSkip = Math.max(0, totalUsers - 100);
  const randomSkip = Math.floor(Math.random() * maxSkip);

  const randomCandidates = await User.find()
    .skip(randomSkip)
    .limit(100)
    .select('nombres apellidos social fundacion personal seguridad')
    .lean();

  // Filtrar los que ya son amigos, limitarlo al cupo, y mapear estandarizado
  let finalResult = randomCandidates
    .filter(u => u && u._id && !excludedSet.has(u._id.toString()) && u.seguridad?.estadoCuenta !== 'suspendido')
    .slice(0, limit)
    .map(u => ({
      ...u,
      _id: u._id.toString(),
      name: `${u.nombres?.primero || ''} ${u.apellidos?.primero || ''}`.trim() || 'Usuario Degader',
      country: u.fundacion?.territorio?.pais || u.personal?.ubicacion?.pais || 'Global',
      role: u.fundacion?.cargo || u.fundacion?.nivel || 'Miembro',
      social: u.social || {},
      nombres: u.nombres || {},
      apellidos: u.apellidos || {},
      fundacion: u.fundacion || {},
      personal: u.personal || {}
    }));

  // === MODO SALVAVIDAS PARA ENTORNOS DE PRUEBAS PEQUEÑOS ===
  // Si filtramos a todos (ej. tienes 15 amigos y la BD solo tiene 15 usuarios), mostramos usuarios de todos modos
  // para no dejar el carrusel vacío en front.
  if (finalResult.length === 0 && randomCandidates.length > 0) {
    logger.warn(`[RECS API] Salvavidas activado: Excluidos todos los candidatos (${randomCandidates.length}). Mostrando de igual manera para no dejar carrusel vacío.`);
    finalResult = randomCandidates
      .filter(u => u && u._id && u._id.toString() !== userId.toString()) // Al menos no recomendarse a sí mismo
      .slice(0, limit)
      .map(u => ({
        ...u,
        _id: u._id.toString(),
        name: `${u.nombres?.primero || ''} ${u.apellidos?.primero || ''}`.trim() || 'Usuario Degader',
        country: u.fundacion?.territorio?.pais || u.personal?.ubicacion?.pais || 'Global',
        role: u.fundacion?.cargo || u.fundacion?.nivel || 'Miembro',
        social: u.social || {},
        nombres: u.nombres || {},
        apellidos: u.apellidos || {},
        fundacion: u.fundacion || {},
        personal: u.personal || {}
      }));
  }

  logger.info(`[RECS API] totalUsers: ${totalUsers}, fetched: ${randomCandidates.length}, excludedSetSize: ${excludedSet.size}, finalOutput: ${finalResult.length}`);

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
