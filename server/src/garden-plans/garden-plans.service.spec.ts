import { GardenPlansService } from './garden-plans.service';

describe('GardenPlansService', () => {
  const prisma = {
    gardenPlan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    planObject: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(prisma));

  const ownership = {
    requireGarden: jest.fn(),
    requireGardenPlan: jest.fn(),
    requirePlanObject: jest.fn(),
  };

  const service = new GardenPlansService(prisma as never, ownership as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('verifies ownership and returns mapped plans', async () => {
      ownership.requireGarden.mockResolvedValue({ id: 'g1', ownerId: 'u1' });
      prisma.gardenPlan.findMany.mockResolvedValue([
        {
          id: 'p1',
          gardenId: 'g1',
          name: 'План 1',
          widthCm: 5000,
          heightCm: 5000,
          boundary: null,
          northAngleDeg: 0,
          gridSizeCm: 50,
          version: 1,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]);

      const result = await service.list('u1', 'g1');
      expect(ownership.requireGarden).toHaveBeenCalledWith('g1', 'u1');
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('p1');
      expect(result[0]!.widthCm).toBe(5000);
    });
  });

  describe('getActive', () => {
    it('returns existing active plan with objects', async () => {
      ownership.requireGarden.mockResolvedValue({ id: 'g1', ownerId: 'u1' });
      prisma.gardenPlan.findFirst.mockResolvedValue({
        id: 'p1',
        gardenId: 'g1',
        name: 'План 1',
        widthCm: 5000,
        heightCm: 5000,
        boundary: null,
        northAngleDeg: 0,
        gridSizeCm: 50,
        version: 1,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        objects: [],
      });

      const result = await service.getActive('u1', 'g1');
      expect(result.id).toBe('p1');
      expect(result.objects).toEqual([]);
    });

    it('auto-creates default plan if none exists', async () => {
      ownership.requireGarden.mockResolvedValue({
        id: 'g1',
        ownerId: 'u1',
        mapWidth: '30.0',
        mapHeight: '40.0',
      });
      prisma.gardenPlan.findFirst.mockResolvedValue(null);
      prisma.gardenPlan.create.mockResolvedValue({
        id: 'p-new',
        gardenId: 'g1',
        name: 'Основний план',
        widthCm: 3000,
        heightCm: 4000,
        boundary: null,
        northAngleDeg: 0,
        gridSizeCm: 50,
        version: 1,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        objects: [],
      });

      const result = await service.getActive('u1', 'g1');
      expect(prisma.gardenPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gardenId: 'g1',
            widthCm: 3000,
            heightCm: 4000,
          }),
        }),
      );
      expect(result.id).toBe('p-new');
    });
  });

  describe('update', () => {
    it('throws 409 conflict when optimistic lock version mismatches', async () => {
      ownership.requireGardenPlan.mockResolvedValue({
        id: 'p1',
        gardenId: 'g1',
        version: 2,
      });

      await expect(
        service.update('u1', 'p1', { version: 1, name: 'Нове імʼя' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'CONFLICT' }),
      });
    });

    it('increments version on successful update', async () => {
      ownership.requireGardenPlan.mockResolvedValue({
        id: 'p1',
        gardenId: 'g1',
        version: 1,
      });
      prisma.gardenPlan.update.mockResolvedValue({
        id: 'p1',
        gardenId: 'g1',
        name: 'Оновлена назва',
        widthCm: 6000,
        heightCm: 6000,
        boundary: null,
        northAngleDeg: 0,
        gridSizeCm: 50,
        version: 2,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.update('u1', 'p1', { version: 1, name: 'Оновлена назва' });
      expect(result.version).toBe(2);
      expect(result.name).toBe('Оновлена назва');
    });
  });

  describe('duplicate', () => {
    it('duplicates plan and all its objects with version 1 and "(копія)"', async () => {
      ownership.requireGardenPlan.mockResolvedValue({
        id: 'p1',
        gardenId: 'g1',
        name: 'Літній план',
        widthCm: 4000,
        heightCm: 3000,
      });
      prisma.gardenPlan.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'p1',
        gardenId: 'g1',
        name: 'Літній план',
        widthCm: 4000,
        heightCm: 3000,
        boundary: null,
        northAngleDeg: 15,
        gridSizeCm: 50,
        version: 3,
        isActive: true,
        objects: [
          {
            id: 'obj1',
            type: 'GAZEBO',
            label: 'Альтанка',
            xCm: 500,
            yCm: 500,
            widthCm: 300,
            heightCm: 300,
            rotationDeg: 0,
            zIndex: 1,
            layer: 'BUILDINGS',
            color: '#d97706',
            locked: false,
            meta: null,
            zoneId: null,
            plantId: null,
          },
        ],
      });

      prisma.gardenPlan.create.mockResolvedValueOnce({ id: 'p-copy' });
      prisma.gardenPlan.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'p-copy',
        gardenId: 'g1',
        name: 'Літній план (копія)',
        widthCm: 4000,
        heightCm: 3000,
        boundary: null,
        northAngleDeg: 15,
        gridSizeCm: 50,
        version: 1,
        isActive: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        objects: [
          {
            id: 'obj-copy-1',
            planId: 'p-copy',
            type: 'GAZEBO',
            label: 'Альтанка',
            xCm: 500,
            yCm: 500,
            widthCm: 300,
            heightCm: 300,
            rotationDeg: 0,
            zIndex: 1,
            layer: 'BUILDINGS',
            color: '#d97706',
            locked: false,
            meta: null,
            zoneId: null,
            plantId: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      });

      const copy = await service.duplicate('u1', 'p1', { isActive: false });
      expect(prisma.gardenPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Літній план (копія)',
            version: 1,
            isActive: false,
          }),
        }),
      );
      expect(prisma.planObject.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              planId: 'p-copy',
              type: 'GAZEBO',
            }),
          ]),
        }),
      );
      expect(copy.id).toBe('p-copy');
      expect(copy.objects).toHaveLength(1);
    });
  });

  describe('saveObjects', () => {
    it('throws 409 conflict when plan version mismatches', async () => {
      ownership.requireGardenPlan.mockResolvedValue({ id: 'p1', version: 3 });

      await expect(
        service.saveObjects('u1', 'p1', { version: 2, objects: [] }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'CONFLICT' }),
      });
    });

    it('throws validation error when object limit of 2000 is exceeded', async () => {
      ownership.requireGardenPlan.mockResolvedValue({ id: 'p1', version: 1 });
      prisma.planObject.count.mockResolvedValue(1999);

      const objects = [
        {
          op: 'upsert' as const,
          type: 'TREE' as const,
          xCm: 10,
          yCm: 10,
          widthCm: 100,
          heightCm: 100,
          rotationDeg: 0,
          zIndex: 0,
          layer: 'PLANTS' as const,
          locked: false,
        },
        {
          op: 'upsert' as const,
          type: 'BUSH' as const,
          xCm: 20,
          yCm: 20,
          widthCm: 100,
          heightCm: 100,
          rotationDeg: 0,
          zIndex: 0,
          layer: 'PLANTS' as const,
          locked: false,
        },
      ];

      await expect(
        service.saveObjects('u1', 'p1', { version: 1, objects }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      });
    });

    it('creates new objects with clientId mapping and updates version', async () => {
      ownership.requireGardenPlan.mockResolvedValue({ id: 'p1', version: 1 });
      prisma.planObject.count.mockResolvedValue(0);
      prisma.planObject.create.mockResolvedValue({
        id: 'new-db-uuid-1',
        planId: 'p1',
      });

      prisma.gardenPlan.update.mockResolvedValue({
        id: 'p1',
        gardenId: 'g1',
        name: 'План',
        widthCm: 5000,
        heightCm: 5000,
        boundary: null,
        northAngleDeg: 0,
        gridSizeCm: 50,
        version: 2,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        objects: [
          {
            id: 'new-db-uuid-1',
            planId: 'p1',
            type: 'GAZEBO',
            label: 'Альтанка',
            xCm: 100,
            yCm: 200,
            widthCm: 300,
            heightCm: 300,
            rotationDeg: 0,
            zIndex: 0,
            layer: 'BUILDINGS',
            color: '#d97706',
            locked: false,
            meta: null,
            zoneId: null,
            plantId: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      });

      const response = await service.saveObjects('u1', 'p1', {
        version: 1,
        objects: [
          {
            op: 'upsert' as const,
            clientId: 'client-temp-1',
            type: 'GAZEBO',
            label: 'Альтанка',
            xCm: 100,
            yCm: 200,
            widthCm: 300,
            heightCm: 300,
            rotationDeg: 0,
            zIndex: 0,
            layer: 'BUILDINGS' as const,
            locked: false,
          },
        ],
      });

      expect(response.idMap['client-temp-1']).toBe('new-db-uuid-1');
      expect(response.plan.version).toBe(2);
      expect(response.plan.objects).toHaveLength(1);
    });
  });
});
