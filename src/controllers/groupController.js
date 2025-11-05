const Group = require('../models/Group');
const Notification = require('../models/Notification');
const { validateGroupData, formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Obtener todos los grupos
 * GET /api/grupos
 */
const getAllGroups = async (req, res) => {
  try {
    const { tipo, categoria, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};

    // Solo grupos públicos o grupos donde el usuario es miembro
    filter.$or = [
      { tipo: 'publico' },
      { 'miembros.usuario': req.userId }
    ];

    if (tipo) filter.tipo = tipo;
    if (categoria) filter.categoria = categoria;

    const groups = await Group.find(filter)
      .populate('creador', 'nombre apellido avatar')
      .populate('miembros.usuario', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Group.countDocuments(filter);

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json(formatErrorResponse('Error al obtener grupos', [error.message]));
  }
};

/**
 * Obtener grupo por ID
 * GET /api/grupos/:id
 */
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id)
      .populate('creador', 'nombre apellido avatar')
      .populate('administradores', 'nombre apellido avatar')
      .populate('moderadores', 'nombre apellido avatar')
      .populate('miembros.usuario', 'nombre apellido avatar');

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar acceso si es privado o secreto
    if (group.tipo !== 'publico') {
      const isMember = group.miembros.some(m => m.usuario._id.equals(req.userId));
      if (!isMember && !group.creador._id.equals(req.userId)) {
        return res.status(403).json(formatErrorResponse('No tienes acceso a este grupo'));
      }
    }

    res.json(formatSuccessResponse('Grupo encontrado', group));
  } catch (error) {
    console.error('Error al obtener grupo:', error);
    res.status(500).json(formatErrorResponse('Error al obtener grupo', [error.message]));
  }
};

/**
 * Crear grupo
 * POST /api/grupos
 */
const createGroup = async (req, res) => {
  try {
    const { nombre, descripcion, tipo, categoria } = req.body;

    // Validar datos
    const validation = validateGroupData({ nombre, tipo });
    if (!validation.isValid) {
      return res.status(400).json(formatErrorResponse('Datos inválidos', validation.errors));
    }

    const groupData = {
      nombre,
      descripcion,
      tipo: tipo || 'publico',
      categoria: categoria || 'General',
      creador: req.userId,
      administradores: [req.userId],
      miembros: [{
        usuario: req.userId,
        rol: 'administrador',
        fechaUnion: new Date()
      }]
    };

    // Agregar imagen si se subió
    if (req.file) {
      groupData.imagen = `/uploads/groups/${req.file.filename}`;
    }

    const group = new Group(groupData);
    await group.save();

    await group.populate([
      { path: 'creador', select: 'nombre apellido avatar' },
      { path: 'miembros.usuario', select: 'nombre apellido avatar' }
    ]);

    res.status(201).json(formatSuccessResponse('Grupo creado exitosamente', group));
  } catch (error) {
    console.error('Error al crear grupo:', error);
    res.status(500).json(formatErrorResponse('Error al crear grupo', [error.message]));
  }
};

/**
 * Actualizar grupo
 * PUT /api/grupos/:id
 */
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, tipo, categoria, reglas, configuracion } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que sea administrador
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId)) ||
                    group.creador.equals(req.userId);

    if (!isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para editar este grupo'));
    }

    // Actualizar campos
    if (nombre) group.nombre = nombre;
    if (descripcion !== undefined) group.descripcion = descripcion;
    if (tipo) group.tipo = tipo;
    if (categoria) group.categoria = categoria;
    if (reglas) group.reglas = reglas;
    if (configuracion) group.configuracion = { ...group.configuracion, ...configuracion };

    // Actualizar imagen si se subió
    if (req.file) {
      group.imagen = `/uploads/groups/${req.file.filename}`;
    }

    await group.save();

    await group.populate([
      { path: 'creador', select: 'nombre apellido avatar' },
      { path: 'miembros.usuario', select: 'nombre apellido avatar' }
    ]);

    res.json(formatSuccessResponse('Grupo actualizado exitosamente', group));
  } catch (error) {
    console.error('Error al actualizar grupo:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar grupo', [error.message]));
  }
};

/**
 * Unirse a grupo
 * POST /api/grupos/:id/join
 */
const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar si ya es miembro
    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (isMember) {
      return res.status(400).json(formatErrorResponse('Ya eres miembro de este grupo'));
    }

    // Si es grupo privado, agregar a solicitudes pendientes
    if (group.tipo === 'privado' && !group.configuracion.requiereAprobacion === false) {
      const hasPendingRequest = group.solicitudesPendientes.some(s => s.usuario.equals(req.userId));
      if (hasPendingRequest) {
        return res.status(400).json(formatErrorResponse('Ya tienes una solicitud pendiente'));
      }

      group.solicitudesPendientes.push({
        usuario: req.userId,
        fecha: new Date()
      });

      await group.save();

      // Notificar a administradores
      const adminNotifications = group.administradores.map(admin => {
        return new Notification({
          receptor: admin,
          emisor: req.userId,
          tipo: 'solicitud_grupo',
          contenido: 'solicitó unirse al grupo',
          referencia: {
            tipo: 'Group',
            id: group._id
          }
        }).save();
      });

      await Promise.all(adminNotifications);

      return res.json(formatSuccessResponse('Solicitud enviada. Espera la aprobación de un administrador'));
    }

    // Si es grupo secreto, no se puede unir directamente
    if (group.tipo === 'secreto') {
      return res.status(403).json(formatErrorResponse('No puedes unirte a este grupo. Debes ser invitado'));
    }

    // Unirse directamente si es público
    group.miembros.push({
      usuario: req.userId,
      rol: 'miembro',
      fechaUnion: new Date()
    });

    await group.save();

    // Notificar al creador
    const notification = new Notification({
      receptor: group.creador,
      emisor: req.userId,
      tipo: 'nuevo_miembro_grupo',
      contenido: 'se unió a tu grupo',
      referencia: {
        tipo: 'Group',
        id: group._id
      }
    });
    await notification.save();

    await group.populate('miembros.usuario', 'nombre apellido avatar');

    res.json(formatSuccessResponse('Te has unido al grupo exitosamente', group));
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    res.status(500).json(formatErrorResponse('Error al unirse al grupo', [error.message]));
  }
};

/**
 * Salir de grupo
 * POST /api/grupos/:id/leave
 */
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // No permitir que el creador salga
    if (group.creador.equals(req.userId)) {
      return res.status(400).json(formatErrorResponse('El creador no puede salir del grupo. Transfiere la propiedad primero o elimina el grupo'));
    }

    // Eliminar de miembros
    group.miembros = group.miembros.filter(m => !m.usuario.equals(req.userId));

    // Eliminar de administradores y moderadores si aplica
    group.administradores = group.administradores.filter(admin => !admin.equals(req.userId));
    group.moderadores = group.moderadores.filter(mod => !mod.equals(req.userId));

    await group.save();

    res.json(formatSuccessResponse('Has salido del grupo exitosamente'));
  } catch (error) {
    console.error('Error al salir del grupo:', error);
    res.status(500).json(formatErrorResponse('Error al salir del grupo', [error.message]));
  }
};

/**
 * Obtener miembros del grupo
 * GET /api/grupos/:id/members
 */
const getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id)
      .populate('miembros.usuario', 'nombre apellido avatar email ultimaConexion');

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    res.json(formatSuccessResponse('Miembros obtenidos', group.miembros));
  } catch (error) {
    console.error('Error al obtener miembros:', error);
    res.status(500).json(formatErrorResponse('Error al obtener miembros', [error.message]));
  }
};

/**
 * Eliminar grupo
 * DELETE /api/grupos/:id
 */
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Solo el creador puede eliminar
    if (!group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('Solo el creador puede eliminar el grupo'));
    }

    await Group.findByIdAndDelete(id);

    res.json(formatSuccessResponse('Grupo eliminado exitosamente'));
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar grupo', [error.message]));
  }
};

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  deleteGroup
};
