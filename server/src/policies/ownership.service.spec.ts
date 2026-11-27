import { OwnershipService } from './ownership.service';

describe('OwnershipService', () => {
  const prisma = {
    garden: { findFirst: jest.fn() },
    gardenZone: { findFirst: jest.fn() },
    plant: { findFirst: jest.fn() },
    gardenPlan: { findFirst: jest.fn() },
    planObject: { findFirst: jest.fn() },
  };

  const service = new OwnershipService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns garden for owner', async () => {
    prisma.garden.findFirst.mockResolvedValue({ id: 'g1', ownerId: 'u1' });
    await expect(service.requireGarden('g1', 'u1')).resolves.toMatchObject({ id: 'g1' });
  });

  it('hides foreign garden as not found', async () => {
    prisma.garden.findFirst.mockResolvedValue(null);
    await expect(service.requireGarden('g1', 'u2')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });

  it('requires zone through garden ownership', async () => {
    prisma.gardenZone.findFirst.mockResolvedValue(null);
    await expect(service.requireZone('z1', 'u2')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });

  it('requires garden plan through garden ownership', async () => {
    prisma.gardenPlan.findFirst.mockResolvedValue(null);
    await expect(service.requireGardenPlan('p1', 'u2')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });

  it('requires plan object through plan and garden ownership', async () => {
    prisma.planObject.findFirst.mockResolvedValue(null);
    await expect(service.requirePlanObject('po1', 'u2')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });
});

