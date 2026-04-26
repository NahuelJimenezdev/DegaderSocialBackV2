const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');
const logger = require('../config/logger');
const { NIVELES_ORDENADOS_ASC, CARGOS_DIRECTIVOS } = require('../constants/fundacionConstants');

/**
 * Obtener usuarios bajo la jurisdicción del director actual
 * GET /api/fundacion/admin/usuarios-jurisdiccion
 */
const getUsuariosBajoJurisdiccion = async (req, res) => {
  const reqStart = Date.now();
  logger.info(`\n\n================================`);
  logger.info(`[Perf] 🚀 Iniciando getUsuariosBajoJurisdiccion. Request ID: ${reqStart}`);
  try {
    const directorId = req.userId;
    const { 
      pais, 
      region, 
      departamento, 
      municipio, 
      area, 
      cargo,
      nivel,
      search,
      estado,
      page = 1,
      limit = 20
    } = req.query;

    const tDirectorStart = Date.now();
    // OPTIMIZACIÓN: Solo traer seguridad y jerarquía del director (Evita 23KB download)
    const director = await User.findById(directorId).select('seguridad fundacion esMiembroFundacion').lean();
    logger.info(`[Perf] [ID: ${reqStart}] ⏳ findById(director) tardó ${Date.now() - tDirectorStart}ms`);
    
    if (!director || !director.esMiembroFundacion || director.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos de acceso al panel administrativo'));
    }

    // 🚫 Afiliados NO pueden acceder al panel administrativo
    if (director.fundacion?.nivel === 'afiliado') {
      return res.status(403).json(formatErrorResponse('Los afiliados no tienen acceso al panel administrativo'));
    }

    const { seguridad } = director;
    const { nivel: nivelDirector, territorio, area: areaDirector } = director.fundacion || {};
    const esFounder = seguridad?.rolSistema === 'Founder';

    // Jerarquía ordenada
    const nivelesOrdenados = NIVELES_ORDENADOS_ASC;

    const indexNivelDirector = nivelesOrdenados.indexOf(nivelDirector?.toLowerCase());
    
    // Si no es Founder ni nivel global, puede ver SU MISMO NIVEL y los niveles inferiores
    const nivelesVisibles = esFounder 
      ? nivelesOrdenados 
      : indexNivelDirector !== -1 
        ? nivelesOrdenados.slice(0, indexNivelDirector + 1)
        : [];

    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'aprobado'
    };

    // --- FILTROS OPCIONALES DEL FRONTEND ---
    if (nivel) query['fundacion.nivel'] = nivel;
    if (area) query['fundacion.area'] = area;
    if (cargo) query['fundacion.cargo'] = cargo;
    if (pais) query['fundacion.territorio.pais'] = pais;
    if (region) query['fundacion.territorio.region'] = region;
    if (departamento) query['fundacion.territorio.departamento'] = departamento;
    if (municipio) query['fundacion.territorio.municipio'] = municipio;
    
    // Filtro de búsqueda por nombre/apellido
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      if (!query.$and) query.$and = [];
      query.$and.push({
        $or: [
          { 'nombres.primero': { $regex: searchRegex } },
          { 'nombres.segundo': { $regex: searchRegex } },
          { 'apellidos.primero': { $regex: searchRegex } },
          { 'apellidos.segundo': { $regex: searchRegex } }
        ]
      });
    }

    // Filtro por Estado (Completado / Pendiente)
    if (estado === 'completado') {
      query['fundacion.hojaDeVida.completado'] = true;
      query['fundacion.entrevista.completado'] = true;
      // Para FHSYL consideramos que tiene algún dato mínimo
      query['fundacion.documentacionFHSYL.testimonioConversion'] = { $exists: true, $ne: '' };
    } else if (estado === 'pendiente') {
      query.$or = query.$or || [];
      query.$or.push(
        { 'fundacion.hojaDeVida.completado': { $ne: true } },
        { 'fundacion.entrevista.completado': { $ne: true } },
        { 'fundacion.documentacionFHSYL.testimonioConversion': { $exists: false } },
        { 'fundacion.documentacionFHSYL.testimonioConversion': '' }
      );
    }

    // --- RESTRICCIONES JERÁRQUICAS ---
    if (!esFounder) {
      // 1. RESTRICCIÓN DE NIVEL
      if (nivel) {
        if (!nivelesVisibles.includes(nivel.toLowerCase())) {
          query['fundacion.nivel'] = 'BLOQUEADO';
        }
      } else {
        query['fundacion.nivel'] = { $in: nivelesVisibles };
      }

      // 2. RESTRICCIÓN DE TERRITORIO
      if (territorio?.pais) {
        query['fundacion.territorio.pais'] = { $regex: new RegExp(`^${territorio.pais.trim()}$`, 'i') };
      }

      // Escalera jerárquica territorial
      if (nivelDirector === 'regional') {
        const regionDelDirector = territorio?.region || '';
        
        if (regionDelDirector) {
            if (!query.$and) query.$and = [];
            query.$and.push({
                $or: [
                  { 'fundacion.territorio.region': { $regex: new RegExp(`^${regionDelDirector.trim()}$`, 'i') } },
                  { 'fundacion.territorio.region': { $exists: false } },
                  { 'fundacion.territorio.region': '' },
                  { 'fundacion.territorio.region': null }
                ]
            });
        }
        
      } else if (nivelDirector === 'departamental' && territorio?.departamento) {
        query['fundacion.territorio.departamento'] = { $regex: new RegExp(`^${territorio.departamento.trim()}$`, 'i') };
      } else if (nivelDirector === 'municipal' && territorio?.municipio) {
        query['fundacion.territorio.municipio'] = { $regex: new RegExp(`^${territorio.municipio.trim()}$`, 'i') };
      }

      // 3. RESTRICCIÓN DE ÁREA
      const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
      const esGlobal = nivelesGlobales.includes(nivelDirector);
      
      const cargoDirector = director.fundacion?.cargo ? director.fundacion.cargo.trim() : '';
      const esSecretario = cargoDirector.toLowerCase().includes('secretario');
      const esDirectorGeneral = CARGOS_DIRECTIVOS.includes(cargoDirector) || esSecretario;

      if (!esGlobal && !esDirectorGeneral && areaDirector) {
        query['fundacion.area'] = areaDirector;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    logger.info(`[Perf] [ID: ${reqStart}] 🔍 Ejecutando Query a MongoDB: ${JSON.stringify(query)}`);
    const tQueryStart = Date.now();
    
    const [usuarios, total] = await Promise.all([
      User.find(query)
        .select('nombres apellidos email social.fotoPerfil fundacion.nivel fundacion.area fundacion.subArea fundacion.programa fundacion.cargo fundacion.territorio fundacion.estadoAprobacion fundacion.activo fundacion.fechaAprobacion fundacion.hojaDeVida.completado fundacion.entrevista.completado fundacion.documentacionFHSYL.testimonioConversion createdAt')
        // Excluir campos pesados que no se usan en la LISTA general
        .select('-fundacion.documentacionFHSYL.llamadoPastoral -fundacion.hojaDeVida.datos -fundacion.entrevista.respuestas')
        .sort({ 'nombres.primero': 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);
    
    logger.info(`[Perf] [ID: ${reqStart}] ⏳ Promise.all(find, count) MONGODB tardó: ${Date.now() - tQueryStart}ms. Registros: ${total}`);
    logger.info(`[Perf] [ID: ${reqStart}] ✅ Fin de endpoint. TOTAL: ${Date.now() - reqStart}ms.`);
    logger.info(`================================\n`);

    res.json(formatSuccessResponse('Usuarios obtenidos exitosamente', {
      usuarios,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }));

  } catch (error) {
    logger.error(`[FundacionAdmin] Error obtener usuarios: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al obtener usuarios', [error.message]));
  }
};

/**
 * Obtener detalle completo de un usuario bajo jurisdicción
 * GET /api/fundacion/admin/usuario/:targetUserId
 * Se usa para ver los formularios (Hoja de Vida, Entrevista, etc.) bajo demanda
 */
const getUsuarioJurisdiccionDetalle = async (req, res) => {
  try {
    const directorId = req.userId;
    const { targetUserId } = req.params;

    // 1. Obtener Director y validar permisos básicos (Optimizado: Solo jerarquía)
    const director = await User.findById(directorId).select('seguridad fundacion esMiembroFundacion').lean();
    if (!director || !director.esMiembroFundacion || director.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos de acceso'));
    }

    // 2. Obtener Usuario Objetivo
    const targetUser = await User.findById(targetUserId).select('-password');
    if (!targetUser || !targetUser.esMiembroFundacion) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado o no es miembro de la fundación'));
    }

    // 3. VALIDAR JURISDICCIÓN (Misma lógica que el listado)
    const esFounder = director.seguridad?.rolSistema === 'Founder';
    if (!esFounder) {
      const { nivel: nivelDir, territorio: terrDir, area: areaDir } = director.fundacion || {};
      const { nivel: nivelTar, territorio: terrTar, area: areaTar } = targetUser.fundacion || {};

      // A. Validación Territorial (País)
      if (terrDir?.pais && terrTar?.pais && terrDir.pais !== terrTar.pais) {
         return res.status(403).json(formatErrorResponse('Sin jurisdicción en este país'));
      }

      // B. Validación de Nivel (No puede ver niveles superiores)
      const nivelesOrdenados = NIVELES_ORDENADOS_ASC;
      const idxDir = nivelesOrdenados.indexOf(nivelDir?.toLowerCase());
      const idxTar = nivelesOrdenados.indexOf(nivelTar?.toLowerCase());

      if (idxDir < idxTar) {
        return res.status(403).json(formatErrorResponse('No tienes rango suficiente para ver este perfil'));
      }

      // C. Validación de Área (Si no es Director General/Global)
      const cargoDirStr = director.fundacion?.cargo || '';
      const esDirectorGral = CARGOS_DIRECTIVOS.includes(cargoDirStr) || cargoDirStr.toLowerCase().includes('secretario');
      
      const esGlobal = ['directivo_general', 'organo_control', 'organismo_internacional'].includes(nivelDir);

      if (!esGlobal && !esDirectorGral && areaDir !== areaTar) {
         return res.status(403).json(formatErrorResponse('Solo puedes ver usuarios de tu misma área'));
      }
    }

    // Si pasó todas las validaciones, entregar el documento COMPLETO
    res.json(formatSuccessResponse('Detalle de usuario obtenido', targetUser));

  } catch (error) {
    logger.error(`[FundacionAdmin] Error detalle: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al obtener detalle del usuario'));
  }
};

module.exports = {
  getUsuariosBajoJurisdiccion,
  getUsuarioJurisdiccionDetalle
};
