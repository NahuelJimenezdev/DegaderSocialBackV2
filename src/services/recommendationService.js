const User = require('../models/User.model');
const Friendship = require('../models/Friendship.model');
const mongoose = require('mongoose');

/**
 * Mapeo de niveles jerárquicos para comparación eficiente.
 * Menor número = Mayor jerarquía.
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
 * Obtener IDs de usuarios a excluir (amigos, pendientes, bloqueados, rechazados)
 */
const getExcludedUserIds = async (userId) => {
  const relations = await Friendship.find({
    $or: [
      { solicitante: userId },
      { receptor: userId }
    ]
  }).select('solicitante receptor').exec();

  const excludedIds = new Set();
  excludedIds.add(userId.toString());

  relations.forEach(rel => {
    excludedIds.add(rel.solicitante.toString());
    excludedIds.add(rel.receptor.toString());
  });

  return Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id));
};

/**
 * Fase 1: Recomendaciones por Jerarquía
 */
const getHierarchyRecommendations = async (user, limit, excludedIds) => {
  if (!user.esMiembroFundacion || !user.fundacion?.nivel) return [];

  const userLevelValue = NIVELES_MAP[user.fundacion.nivel];
  if (userLevelValue === undefined || userLevelValue === 0) return []; // Ya es el nivel máximo o nivel desconocido

  // Identificar niveles superiores ordenados por cercanía (descendente hasta el usuario)
  // Ejemplo: Si soy 4 (regional), busco 3 (nacional), luego 2, etc.
  const superiorLevels = [];
  for (let i = userLevelValue - 1; i >= 0; i--) {
    superiorLevels.push(NIVELES_FUNDACION[i]);
  }

  let results = [];
  const userCountry = user.personal?.ubicacion?.pais;

  for (const level of superiorLevels) {
    if (results.length >= limit) break;

    const remainingLimit = limit - results.length;
    
    // Buscar en el mismo país primero
    const sameCountryQuery = {
      _id: { $nin: [...excludedIds, ...results.map(r => r._id)] },
      esMiembroFundacion: true,
      "fundacion.nivel": level,
      "fundacion.estadoAprobacion": "aprobado",
      "personal.ubicacion.pais": userCountry
    };

    const sameCountryResults = await User.find(sameCountryQuery)
      .limit(remainingLimit)
      .select('nombres apellidos social fundacion personal')
      .exec();

    results.push(...sameCountryResults);

    if (results.length < limit) {
      // Buscar globalmente en ese nivel
      const globalQuery = {
        _id: { $nin: [...excludedIds, ...results.map(r => r._id)] },
        esMiembroFundacion: true,
        "fundacion.nivel": level,
        "fundacion.estadoAprobacion": "aprobado"
      };

      const globalResults = await User.find(globalQuery)
        .limit(limit - results.length)
        .select('nombres apellidos social fundacion personal')
        .exec();

      results.push(...globalResults);
    }
  }

  return results;
};

/**
 * Fase 2: Recomendaciones por Relevancia
 */
const getRelevanceRecommendations = async (user, limit, excludedIds) => {
  const userCountry = user.personal?.ubicacion?.pais;
  
  // Priorizar populares en el mismo país
  const query = {
    _id: { $nin: excludedIds },
    "seguridad.estadoCuenta": "activo"
  };

  const results = await User.find(query)
    .sort({ 
      "social.stats.seguidores": -1, 
      "seguridad.ultimaConexion": -1 
    })
    .limit(limit)
    .select('nombres apellidos social fundacion personal')
    .exec();

  return results;
};

/**
 * Fase 3: Descubrimiento (Aleatorio)
 */
const getDiscoveryRecommendations = async (user, limit, excludedIds) => {
  // Uso de $sample para aleatoriedad (puede ser costoso en colecciones gigantes, 
  // pero para lotes pequeños de descubrimiento es aceptable si el filtro inicial es amplio)
  const results = await User.aggregate([
    { $match: { _id: { $nin: excludedIds }, "seguridad.estadoCuenta": "activo" } },
    { $sample: { size: limit } },
    { $project: { nombres: 1, apellidos: 1, social: 1, fundacion: 1, personal: 1 } }
  ]).exec();

  return results;
};

/**
 * Servicio Principal de Recomendaciones
 */
const getRecommendedUsers = async (userId, limit = 10, clientExcludedIds = []) => {
  const user = await User.findById(userId).exec();
  if (!user) throw new Error('Usuario no encontrado');

  // Obtener IDs base a excluir (relaciones existentes)
  const baseExcludedIds = await getExcludedUserIds(userId);
  
  // Combinar con IDs enviados por el cliente
  const allExcludedIds = [...new Set([
    ...baseExcludedIds,
    ...clientExcludedIds.map(id => new mongoose.Types.ObjectId(id))
  ])];

  let recommendations = [];

  // FASE 1: Jerarquía
  const hierarchyRecs = await getHierarchyRecommendations(user, limit, allExcludedIds);
  recommendations.push(...hierarchyRecs);

  // FASE 2: Relevancia
  if (recommendations.length < limit) {
    const currentExcluded = [...allExcludedIds, ...recommendations.map(r => r._id)];
    const relevanceRecs = await getRelevanceRecommendations(user, limit - recommendations.length, currentExcluded);
    recommendations.push(...relevanceRecs);
  }

  // FASE 3: Descubrimiento
  if (recommendations.length < limit) {
    const currentExcluded = [...allExcludedIds, ...recommendations.map(r => r._id)];
    const discoveryRecs = await getDiscoveryRecommendations(user, limit - recommendations.length, currentExcluded);
    recommendations.push(...discoveryRecs);
  }

  // Mapear al formato esperado por el frontend
  return recommendations.map(u => ({
    ...u,
    _id: u._id,
    name: `${u.nombres?.primero || ''} ${u.apellidos?.primero || ''}`.trim() || 'Usuario Degader',
    country: u.personal?.ubicacion?.pais || 'Global',
    role: u.fundacion?.cargo || u.fundacion?.nivel || 'Miembro',
    // Asegurar que las subestructuras existan para el frontend
    social: u.social || {},
    nombres: u.nombres || {},
    apellidos: u.apellidos || {},
    fundacion: u.fundacion || {},
    personal: u.personal || {}
  }));
};

module.exports = {
  getRecommendedUsers
};
