const { resolverUsuariosPorJerarquia } = require('../src/services/jerarquiaResolver');
const UserV2 = require('../src/models/User.model');

// Mock de UserV2
jest.mock('../src/models/User.model');

describe('JerarquiaResolver Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('debe resolver usuarios nivel Nacional', async () => {
    const mockUsers = [{ _id: 'user1', fundacion: { cargo: 'Director nacional' } }];
    UserV2.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUsers)
    });

    const result = await resolverUsuariosPorJerarquia({
      area: 'Área de Salud',
      nivel: 'Nacional',
      pais: 'Argentina'
    });

    expect(UserV2.find).toHaveBeenCalledWith(expect.objectContaining({
      'fundacion.area': 'Área de Salud',
      'ubicacion.pais': 'Argentina',
      'fundacion.cargo': expect.objectContaining({ $in: expect.arrayContaining(['Director nacional']) })
    }));
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('user1');
  });

  test('debe resolver usuarios nivel Provincial', async () => {
    const mockUsers = [{ _id: 'user2', fundacion: { cargo: 'Director provincial' } }];
    UserV2.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUsers)
    });

    const result = await resolverUsuariosPorJerarquia({
      area: 'Área de Educación',
      nivel: 'Provincial',
      pais: 'Argentina',
      provincia: 'Buenos Aires'
    });

    expect(UserV2.find).toHaveBeenCalledWith(expect.objectContaining({
      'fundacion.area': 'Área de Educación',
      'ubicacion.pais': 'Argentina',
      'ubicacion.subdivision': 'Buenos Aires'
    }));
    expect(result).toHaveLength(1);
  });

  test('debe retornar array vacío si no hay usuarios', async () => {
    UserV2.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([])
    });

    const result = await resolverUsuariosPorJerarquia({
      area: 'Área Inexistente',
      nivel: 'Nacional'
    });

    expect(result).toEqual([]);
  });
});
