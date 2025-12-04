const Folder = require('../src/models/Folder');

describe('Folder Model', () => {
  let mockFolder;

  beforeEach(() => {
    mockFolder = new Folder({
      nombre: 'Test Folder',
      propietario: 'user1',
      tipo: 'personal',
      activa: true,
      compartidaCon: [
        { usuario: 'user2', permisos: 'lectura' },
        { usuario: 'user3', permisos: 'escritura' },
        { usuario: 'user4', permisos: 'admin' }
      ]
    });
  });

  describe('tienePermiso', () => {
    test('propietario debe tener todos los permisos', async () => {
      expect(await mockFolder.tienePermiso('user1', 'lectura')).toBe(true);
      expect(await mockFolder.tienePermiso('user1', 'escritura')).toBe(true);
      expect(await mockFolder.tienePermiso('user1', 'admin')).toBe(true);
    });

    test('usuario con lectura solo debe tener lectura', async () => {
      expect(await mockFolder.tienePermiso('user2', 'lectura')).toBe(true);
      expect(await mockFolder.tienePermiso('user2', 'escritura')).toBe(false);
      expect(await mockFolder.tienePermiso('user2', 'admin')).toBe(false);
    });

    test('usuario con escritura debe tener lectura y escritura', async () => {
      expect(await mockFolder.tienePermiso('user3', 'lectura')).toBe(true);
      expect(await mockFolder.tienePermiso('user3', 'escritura')).toBe(true);
      expect(await mockFolder.tienePermiso('user3', 'admin')).toBe(false);
    });

    test('usuario con admin debe tener todos los permisos', async () => {
      expect(await mockFolder.tienePermiso('user4', 'lectura')).toBe(true);
      expect(await mockFolder.tienePermiso('user4', 'escritura')).toBe(true);
      expect(await mockFolder.tienePermiso('user4', 'admin')).toBe(true);
    });

    test('usuario no compartido no debe tener permisos', async () => {
      expect(await mockFolder.tienePermiso('user5', 'lectura')).toBe(false);
    });
  });
});
