const User = require('../models/User.model');
const ExcelJS = require('exceljs');
const { formatErrorResponse } = require('../utils/validators');
const logger = require('../config/logger');

/**
 * Descargar base de datos de usuarios bajo jurisdicción en formato Excel
 * GET /api/fundacion/admin/descargar-base?pais=...&nivel=...&cargo=...&search=...
 * 
 * Respeta la misma lógica de jurisdicción que getUsuariosBajoJurisdiccion:
 * - Founder ve todo el mundo
 * - Nacional ve solo su país
 * - Regional ve su región
 * - Departamental ve su departamento
 * - Municipal ve su municipio
 * Etc.
 */
const descargarBase = async (req, res) => {
  try {
    const directorId = req.userId;
    const { pais, region, departamento, municipio, area, cargo, nivel, search } = req.query;

    // 1. Obtener director y validar permisos
    const director = await User.findById(directorId).select('seguridad fundacion esMiembroFundacion nombres apellidos').lean();

    if (!director || !director.esMiembroFundacion || director.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos de acceso al panel administrativo'));
    }

    if (director.fundacion?.nivel === 'afiliado') {
      return res.status(403).json(formatErrorResponse('Los afiliados no tienen acceso a esta función'));
    }

    const { seguridad } = director;
    const { nivel: nivelDirector, territorio, area: areaDirector } = director.fundacion || {};
    const esFounder = seguridad?.rolSistema === 'Founder';

    // Jerarquía ordenada
    const nivelesOrdenados = [
      "afiliado", "local", "barrial", "municipal",
      "departamental", "regional", "nacional",
      "organismo_internacional", "organo_control", "directivo_general"
    ];

    const indexNivelDirector = nivelesOrdenados.indexOf(nivelDirector?.toLowerCase());

    const nivelesVisibles = esFounder
      ? nivelesOrdenados
      : indexNivelDirector !== -1
        ? nivelesOrdenados.slice(0, indexNivelDirector + 1)
        : [];

    // 2. Construir query (misma lógica que getUsuariosBajoJurisdiccion)
    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'aprobado'
    };

    // Filtros opcionales del frontend
    if (nivel) query['fundacion.nivel'] = nivel;
    if (area) query['fundacion.area'] = area;
    if (cargo) query['fundacion.cargo'] = cargo;
    if (pais) query['fundacion.territorio.pais'] = pais;
    if (region) query['fundacion.territorio.region'] = region;
    if (departamento) query['fundacion.territorio.departamento'] = departamento;
    if (municipio) query['fundacion.territorio.municipio'] = municipio;

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

    // Restricciones jerárquicas (igual que en el listado)
    if (!esFounder) {
      if (nivel) {
        if (!nivelesVisibles.includes(nivel.toLowerCase())) {
          query['fundacion.nivel'] = 'BLOQUEADO';
        }
      } else {
        query['fundacion.nivel'] = { $in: nivelesVisibles };
      }

      if (territorio?.pais) {
        query['fundacion.territorio.pais'] = { $regex: new RegExp(`^${territorio.pais.trim()}$`, 'i') };
      }

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

    // 3. Obtener TODOS los usuarios (sin paginación) con los campos requeridos
    logger.info(`[Export] Descargando base. Query: ${JSON.stringify(query)}`);

    const usuarios = await User.find(query)
      .select([
        'nombres.primero', 'nombres.segundo',
        'apellidos.primero', 'apellidos.segundo',
        'email',
        'personal.genero',
        'personal.ubicacion.pais', 'personal.ubicacion.estado',
        'personal.ubicacion.ciudad', 'personal.ubicacion.barrio',
        'personal.direccion',
        'fundacion.territorio.pais', 'fundacion.territorio.region',
        'fundacion.territorio.departamento', 'fundacion.territorio.municipio',
        'fundacion.territorio.barrio',
        'fundacion.organismoInternacional.pertenece',
        'fundacion.documentacionFHSYL',
        'fundacion.entrevista.completado',
        'fundacion.hojaDeVida.completado',
        'fundacion.fechaIngreso',
        'fundacion.area',
        'fundacion.cargo',
        'fundacion.nivel',
        'fundacion.aprobadoPor',
        'eclesiastico.activo',
        'eclesiastico.iglesia',
        'eclesiastico.rolPrincipal'
      ].join(' '))
      .populate('fundacion.aprobadoPor', 'nombres.primero apellidos.primero')
      .populate('eclesiastico.iglesia', 'nombre')
      .sort({ 'nombres.primero': 1 })
      .lean();

    logger.info(`[Export] Encontrados ${usuarios.length} usuarios para exportar`);

    // 4. Generar Excel con ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FHIS&L - Panel Administrativo';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Base de Miembros', {
      properties: { tabColor: { argb: '2563EB' } }
    });

    // Definir columnas
    worksheet.columns = [
      { header: 'Primer Nombre', key: 'primerNombre', width: 18 },
      { header: 'Segundo Nombre', key: 'segundoNombre', width: 18 },
      { header: 'Primer Apellido', key: 'primerApellido', width: 18 },
      { header: 'Segundo Apellido', key: 'segundoApellido', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Género', key: 'genero', width: 10 },
      { header: 'País (Residencia)', key: 'ubicPais', width: 18 },
      { header: 'Estado/Depto (Residencia)', key: 'ubicEstado', width: 22 },
      { header: 'Ciudad (Residencia)', key: 'ubicCiudad', width: 18 },
      { header: 'Barrio (Residencia)', key: 'ubicBarrio', width: 18 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'País (Territorio)', key: 'terrPais', width: 18 },
      { header: 'Región (Territorio)', key: 'terrRegion', width: 20 },
      { header: 'Departamento (Territorio)', key: 'terrDepto', width: 22 },
      { header: 'Municipio (Territorio)', key: 'terrMunicipio', width: 20 },
      { header: 'Barrio (Territorio)', key: 'terrBarrio', width: 18 },
      { header: 'Org. Internacional', key: 'orgInternacional', width: 18 },
      { header: 'Doc. FHSYL Completada', key: 'docFHSYL', width: 22 },
      { header: 'Entrevista Completada', key: 'entrevista', width: 22 },
      { header: 'Hoja de Vida Completada', key: 'hojaDeVida', width: 22 },
      { header: 'Fecha de Ingreso', key: 'fechaIngreso', width: 18 },
      { header: 'Área', key: 'area', width: 30 },
      { header: 'Cargo', key: 'cargo', width: 28 },
      { header: 'Nivel', key: 'nivel', width: 18 },
      { header: 'Aprobado Por', key: 'aprobadoPor', width: 25 },
      { header: 'Eclesiástico Activo', key: 'eclActivo', width: 18 },
      { header: 'Iglesia', key: 'eclIglesia', width: 25 },
      { header: 'Rol Eclesiástico', key: 'eclRol', width: 20 }
    ];

    // Estilo del encabezado
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2563EB' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '1E40AF' } },
        left: { style: 'thin', color: { argb: '1E40AF' } },
        bottom: { style: 'thin', color: { argb: '1E40AF' } },
        right: { style: 'thin', color: { argb: '1E40AF' } }
      };
    });
    worksheet.getRow(1).height = 28;

    // Determinar si la documentación FHSYL está "completada" 
    // (tiene al menos testimonioConversion o ocupacion o estadoCivil)
    const isDocFHSYLCompleted = (doc) => {
      if (!doc) return false;
      return !!(doc.testimonioConversion || doc.ocupacion || doc.estadoCivil);
    };

    // Agregar filas
    usuarios.forEach((u, index) => {
      const aprobadoPorNombre = u.fundacion?.aprobadoPor
        ? `${u.fundacion.aprobadoPor.nombres?.primero || ''} ${u.fundacion.aprobadoPor.apellidos?.primero || ''}`.trim()
        : '';

      const iglesiaNombre = u.eclesiastico?.iglesia?.nombre || '';

      const row = worksheet.addRow({
        primerNombre: u.nombres?.primero || '',
        segundoNombre: u.nombres?.segundo || '',
        primerApellido: u.apellidos?.primero || '',
        segundoApellido: u.apellidos?.segundo || '',
        direccion: u.personal?.direccion || '',
        email: u.email || '',
        genero: u.personal?.genero || '',
        ubicPais: u.personal?.ubicacion?.pais || '',
        ubicEstado: u.personal?.ubicacion?.estado || '',
        ubicCiudad: u.personal?.ubicacion?.ciudad || '',
        ubicBarrio: u.personal?.ubicacion?.barrio || '',
        terrPais: u.fundacion?.territorio?.pais || '',
        terrRegion: u.fundacion?.territorio?.region || '',
        terrDepto: u.fundacion?.territorio?.departamento || '',
        terrMunicipio: u.fundacion?.territorio?.municipio || '',
        terrBarrio: u.fundacion?.territorio?.barrio || '',
        orgInternacional: u.fundacion?.organismoInternacional?.pertenece ? 'Sí' : 'No',
        docFHSYL: isDocFHSYLCompleted(u.fundacion?.documentacionFHSYL) ? 'Sí' : 'No',
        entrevista: u.fundacion?.entrevista?.completado ? 'Sí' : 'No',
        hojaDeVida: u.fundacion?.hojaDeVida?.completado ? 'Sí' : 'No',
        fechaIngreso: u.fundacion?.fechaIngreso
          ? new Date(u.fundacion.fechaIngreso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '',
        area: u.fundacion?.area || '',
        cargo: u.fundacion?.cargo || '',
        nivel: u.fundacion?.nivel || '',
        aprobadoPor: aprobadoPorNombre,
        eclActivo: u.eclesiastico?.activo ? 'Sí' : 'No',
        eclIglesia: iglesiaNombre,
        eclRol: u.eclesiastico?.rolPrincipal || ''
      });

      // Alternar colores de fila (zebra)
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F0F7FF' }
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Agregar filtros automáticos a toda la tabla
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: usuarios.length + 1, column: 28 }
    };

    // Congelar la primera fila
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 5. Enviar como descarga
    const fileName = `Base_Miembros_FHSYL_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();

    logger.info(`[Export] Base descargada exitosamente por ${director.nombres?.primero} ${director.apellidos?.primero}. Total registros: ${usuarios.length}`);

  } catch (error) {
    logger.error(`[Export] Error al descargar base: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al generar el archivo Excel', [error.message]));
  }
};

module.exports = {
  descargarBase
};
