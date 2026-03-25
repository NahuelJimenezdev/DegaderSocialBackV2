const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');
const logger = require('../config/logger');

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
      page = 1,
      limit = 20
    } = req.query;

    const tDirectorStart = Date.now();
    const director = await User.findById(directorId);
    logger.info(`[Perf] [ID: ${reqStart}] ⏳ findById(director) tardó ${Date.now() - tDirectorStart}ms`);
    
    if (!director || !director.esMiembroFundacion || director.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos de acceso al panel administrativo'));
    }

    const { seguridad } = director;
    const { nivel: nivelDirector, territorio, area: areaDirector } = director.fundacion || {};
    const esFounder = seguridad?.rolSistema === 'Founder';

    // Jerarquía ordenada
    const nivelesOrdenados = [
      "local", "barrial", "municipal",
      "departamental", "regional", "nacional",
      "organismo_internacional", "organo_control", "directivo_general"
    ];

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
      const esDirectorGeneral = [
        'Director General (Pastor)', 
        'Director General', 
        'Sub-Director General', 
        'secretario Director General', 
        'secretario Sub-Director General',
        'Secretario Ejecutivo',
        'Director Nacional',
        'Director Regional',
        'Director Departamental',
        'Coordinador Municipal'
      ].includes(cargoDirector);

      if (!esGlobal && !esDirectorGeneral && areaDirector) {
        query['fundacion.area'] = areaDirector;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    logger.info(`[Perf] [ID: ${reqStart}] 🔍 Ejecutando Query a MongoDB: ${JSON.stringify(query)}`);
    const tQueryStart = Date.now();
    
    const [usuarios, total] = await Promise.all([
      User.find(query)
        .select('nombres apellidos email social.fotoPerfil fundacion.nivel fundacion.area fundacion.cargo fundacion.territorio fundacion.estadoAprobacion fundacion.activo fundacion.fechaAprobacion createdAt')
        // Excluir campones pesados que no se usan en la LISTA general
        .select('-fundacion.documentacionFHSYL.testimonioConversion -fundacion.documentacionFHSYL.llamadoPastoral -fundacion.hojaDeVida.datos -fundacion.entrevista.respuestas')
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

module.exports = {
  getUsuariosBajoJurisdiccion
};
