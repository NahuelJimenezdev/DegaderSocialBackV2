const Grupo = require('../models/Grupo');

class GrupoService {
  /**
   * Crear grupo
   */
  async createGroup(groupData, creadorId) {
    const grupo = new Grupo({
      ...groupData,
      creador: creadorId,
      miembros: [{
        usuario: creadorId,
        rol: 'admin',
        fechaUnion: new Date()
      }]
    });

    await grupo.save();
    await grupo.populate('creador', 'nombre apellido avatar');
    await grupo.populate('miembros.usuario', 'nombre apellido avatar');

    return grupo;
  }

  /**
   * Obtener todos los grupos
   */
  async getAllGroups(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;

    const query = { activo: true, ...filters };

    // Solo mostrar grupos públicos o privados (no secretos)
    if (!filters.tipo) {
      query.tipo = { $in: ['publico', 'privado'] };
    }

    const grupos = await Grupo.find(query)
      .populate('creador', 'nombre apellido avatar')
      .populate('miembros.usuario', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Grupo.countDocuments(query);

    return {
      grupos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener grupo por ID
   */
  async getGroupById(grupoId, userId = null) {
    const grupo = await Grupo.findById(grupoId)
      .populate('creador', 'nombre apellido avatar')
      .populate('miembros.usuario', 'nombre apellido avatar');

    if (!grupo || !grupo.activo) {
      throw new Error('Grupo no encontrado');
    }

    // Si es secreto, verificar que el usuario sea miembro
    if (grupo.tipo === 'secreto' && userId) {
      const isMember = grupo.miembros.some(
        m => m.usuario._id.toString() === userId.toString()
      );

      if (!isMember) {
        throw new Error('No tienes acceso a este grupo');
      }
    }

    return grupo;
  }

  /**
   * Unirse a un grupo
   */
  async joinGroup(grupoId, userId) {
    const grupo = await Grupo.findById(grupoId);

    if (!grupo || !grupo.activo) {
      throw new Error('Grupo no encontrado');
    }

    // Verificar si ya es miembro
    const isMember = grupo.miembros.some(
      m => m.usuario.toString() === userId.toString()
    );

    if (isMember) {
      throw new Error('Ya eres miembro de este grupo');
    }

    // Si es privado, agregar a solicitudes pendientes
    if (grupo.tipo === 'privado') {
      if (grupo.solicitudesPendientes.includes(userId)) {
        throw new Error('Ya has enviado una solicitud');
      }

      grupo.solicitudesPendientes.push(userId);
      await grupo.save();

      return { message: 'Solicitud enviada. Espera la aprobación del administrador.' };
    }

    // Si es público, agregar directamente
    grupo.miembros.push({
      usuario: userId,
      rol: 'miembro',
      fechaUnion: new Date()
    });

    await grupo.save();
    await grupo.populate('miembros.usuario', 'nombre apellido avatar');

    return grupo;
  }

  /**
   * Salir de un grupo
   */
  async leaveGroup(grupoId, userId) {
    const grupo = await Grupo.findById(grupoId);

    if (!grupo) {
      throw new Error('Grupo no encontrado');
    }

    // No puede salir si es el único admin
    const admins = grupo.miembros.filter(m => m.rol === 'admin');
    const userMember = grupo.miembros.find(m => m.usuario.toString() === userId.toString());

    if (admins.length === 1 && userMember?.rol === 'admin') {
      throw new Error('No puedes salir siendo el único administrador. Asigna otro admin primero.');
    }

    grupo.miembros = grupo.miembros.filter(
      m => m.usuario.toString() !== userId.toString()
    );

    await grupo.save();

    return { message: 'Has salido del grupo exitosamente' };
  }

  /**
   * Aceptar solicitud de ingreso
   */
  async acceptJoinRequest(grupoId, userId, adminId) {
    const grupo = await Grupo.findById(grupoId);

    if (!grupo) {
      throw new Error('Grupo no encontrado');
    }

    // Verificar que quien acepta sea admin
    const isAdmin = grupo.miembros.some(
      m => m.usuario.toString() === adminId.toString() && m.rol === 'admin'
    );

    if (!isAdmin) {
      throw new Error('No tienes permisos para aceptar solicitudes');
    }

    // Verificar que el usuario tenga solicitud pendiente
    const requestIndex = grupo.solicitudesPendientes.indexOf(userId);

    if (requestIndex === -1) {
      throw new Error('No hay solicitud pendiente de este usuario');
    }

    // Remover de solicitudes y agregar a miembros
    grupo.solicitudesPendientes.splice(requestIndex, 1);
    grupo.miembros.push({
      usuario: userId,
      rol: 'miembro',
      fechaUnion: new Date()
    });

    await grupo.save();

    return grupo;
  }

  /**
   * Actualizar rol de miembro
   */
  async updateMemberRole(grupoId, userId, newRole, adminId) {
    const grupo = await Grupo.findById(grupoId);

    if (!grupo) {
      throw new Error('Grupo no encontrado');
    }

    // Verificar que quien actualiza sea admin
    const isAdmin = grupo.miembros.some(
      m => m.usuario.toString() === adminId.toString() && m.rol === 'admin'
    );

    if (!isAdmin) {
      throw new Error('No tienes permisos para actualizar roles');
    }

    const member = grupo.miembros.find(m => m.usuario.toString() === userId.toString());

    if (!member) {
      throw new Error('Usuario no es miembro del grupo');
    }

    member.rol = newRole;
    await grupo.save();

    return grupo;
  }

  /**
   * Eliminar grupo
   */
  async deleteGroup(grupoId, userId) {
    const grupo = await Grupo.findById(grupoId);

    if (!grupo) {
      throw new Error('Grupo no encontrado');
    }

    if (grupo.creador.toString() !== userId.toString()) {
      throw new Error('Solo el creador puede eliminar el grupo');
    }

    grupo.activo = false;
    await grupo.save();

    return { message: 'Grupo eliminado exitosamente' };
  }
}

module.exports = new GrupoService();
