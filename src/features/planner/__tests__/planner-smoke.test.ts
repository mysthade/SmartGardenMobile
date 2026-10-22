import { useGardenPlannerStore } from '../store/use-planner-store';
import { cmToPx, pxToCm } from '@smart-garden/validation';
import type { GardenPlanDetailsDto, GardenPlanDto, PlanObjectOperationDto } from '@smart-garden/types';

describe('Garden Planner Comprehensive Smoke Tests', () => {
  const dummyPlan: GardenPlanDetailsDto = {
    id: 'plan-smoke',
    gardenId: 'garden-smoke',
    name: 'Smoke Plan',
    widthCm: 3000,
    heightCm: 2000,
    boundary: [
      { xCm: 0, yCm: 0 },
      { xCm: 3000, yCm: 0 },
      { xCm: 3000, yCm: 2000 },
      { xCm: 0, yCm: 2000 },
    ],
    northAngleDeg: 15,
    gridSizeCm: 50,
    version: 3,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    objects: [
      {
        id: 'srv-1',
        planId: 'plan-smoke',
        type: 'HOUSE',
        label: 'House',
        xCm: 200,
        yCm: 200,
        widthCm: 800,
        heightCm: 600,
        rotationDeg: 0,
        zIndex: 1,
        layer: 'BUILDINGS',
        color: '#d97706',
        locked: false,
        meta: null,
        zoneId: null,
        plantId: null,
        createdAt: '',
        updatedAt: '',
      },
    ],
  };

  const allPlans: GardenPlanDto[] = [dummyPlan];

  beforeEach(() => {
    useGardenPlannerStore.getState().hydrate(dummyPlan, allPlans);
  });

  it('1. Додати обʼєкт: додає у store, генерує clientId, виділяє та позначає dirty', () => {
    const store = useGardenPlannerStore.getState();
    const id = store.addObjectFromPreset('GAZEBO', { xCm: 500, yCm: 500 });

    const state = useGardenPlannerStore.getState();
    expect(state.objects[id]).toBeDefined();
    expect(state.objects[id]?.isNew).toBe(true);
    expect(state.objects[id]?.xCm).toBe(500);
    expect(state.objects[id]?.yCm).toBe(500);
    expect(state.selectedIds).toEqual([id]);
    expect(state.dirtyIds).toContain(id);
    expect(state.saveStatus).toBe('dirty');
  });

  it('2. Перемістити обʼєкт: оновлює координати вибраного обʼєкта', () => {
    const store = useGardenPlannerStore.getState();
    store.select('srv-1');
    store.moveSelected(100, 150);

    const updated = useGardenPlannerStore.getState().objects['srv-1']!;
    expect(updated.xCm).toBe(300);
    expect(updated.yCm).toBe(350);
    expect(useGardenPlannerStore.getState().dirtyIds).toContain('srv-1');
  });

  it('3. Змінити розмір обʼєкта (commitObjectTransform)', () => {
    const store = useGardenPlannerStore.getState();
    store.commitObjectTransform('srv-1', { widthCm: 1000, heightCm: 750 });

    const updated = useGardenPlannerStore.getState().objects['srv-1']!;
    expect(updated.widthCm).toBe(1000);
    expect(updated.heightCm).toBe(750);
    expect(useGardenPlannerStore.getState().saveStatus).toBe('dirty');
  });

  it('4. Повернути обʼєкт (нормалізація кута в межах 0..360)', () => {
    const store = useGardenPlannerStore.getState();
    store.commitObjectTransform('srv-1', { rotationDeg: 405 });
    expect(useGardenPlannerStore.getState().objects['srv-1']?.rotationDeg).toBe(45);

    store.commitObjectTransform('srv-1', { rotationDeg: -30 });
    expect(useGardenPlannerStore.getState().objects['srv-1']?.rotationDeg).toBe(330);
  });

  it('5. Видалити обʼєкт: знімає виділення та позначає deleted=true для збережених', () => {
    const store = useGardenPlannerStore.getState();
    store.select('srv-1');
    store.deleteSelected();

    const state = useGardenPlannerStore.getState();
    expect(state.selectedIds).toHaveLength(0);
    expect(state.objects['srv-1']?.deleted).toBe(true);
    expect(state.dirtyIds).toContain('srv-1');
  });

  it('6. Undo / Redo: повертає попередній стан після операцій', () => {
    const store = useGardenPlannerStore.getState();
    store.commitObjectTransform('srv-1', { xCm: 500, yCm: 500 });
    expect(useGardenPlannerStore.getState().objects['srv-1']?.xCm).toBe(500);

    useGardenPlannerStore.getState().undo();
    expect(useGardenPlannerStore.getState().objects['srv-1']?.xCm).toBe(200);

    useGardenPlannerStore.getState().redo();
    expect(useGardenPlannerStore.getState().objects['srv-1']?.xCm).toBe(500);
  });

  it('7. Збереження diff: формує точні операції upsert/delete для API', () => {
    const store = useGardenPlannerStore.getState();

    // Створимо новий
    const newId = store.addObjectFromPreset('TREE', { xCm: 1000, yCm: 1000 });

    // Модифікуємо існуючий
    store.commitObjectTransform('srv-1', { xCm: 250 });

    const state = useGardenPlannerStore.getState();
    const ops: PlanObjectOperationDto[] = [];

    for (const dirtyId of state.dirtyIds) {
      const obj = state.objects[dirtyId];
      if (!obj) continue;
      if (obj.deleted) {
        if (!obj.isNew) ops.push({ op: 'delete', id: obj.id });
      } else {
        ops.push({
          op: 'upsert',
          id: obj.isNew ? undefined : obj.id,
          clientId: obj.clientId ?? obj.id,
          type: obj.type,
          label: obj.label,
          xCm: obj.xCm,
          yCm: obj.yCm,
          widthCm: obj.widthCm,
          heightCm: obj.heightCm,
          rotationDeg: obj.rotationDeg,
          zIndex: obj.zIndex,
          layer: obj.layer,
          color: obj.color,
          locked: obj.locked,
          meta: obj.meta,
          zoneId: obj.zoneId,
          plantId: obj.plantId,
        });
      }
    }

    expect(ops).toHaveLength(2);
    const newOp = ops.find((o) => o.clientId === newId);
    expect(newOp).toBeDefined();
    expect(newOp?.op).toBe('upsert');
    expect(newOp?.id).toBeUndefined(); // нові обʼєкти без id

    const updateOp = ops.find((o) => o.id === 'srv-1');
    expect(updateOp).toBeDefined();
    expect(updateOp?.op).toBe('upsert');
    expect(updateOp?.xCm).toBe(250);
  });

  it('8. Round-trip координат із форматом web (cmToPx <-> pxToCm)', () => {
    const scales = [0.1, 0.25, 0.5, 1.0, 2.0, 3.5];
    const testValuesCm = [0, 50, 100, 375, 1280, 2500.5];

    for (const scale of scales) {
      for (const valCm of testValuesCm) {
        const px = cmToPx(valCm, scale);
        const backToCm = pxToCm(px, scale);
        expect(Math.abs(backToCm - valCm)).toBeLessThan(0.0001);
        const valMeters = valCm / 100;
        const backToMeters = backToCm / 100;
        expect(Math.abs(backToMeters - valMeters)).toBeLessThan(1e-6);
      }
    }
  });

  it('9. Перемикання режимів (2D <-> 2.5D <-> 3D) зберігає вибір обʼєктів і стан камери', () => {
    const store = useGardenPlannerStore.getState();
    store.select('srv-1');
    store.setCamera3D({ yawDeg: 45, pitchDeg: 60, distance: 1.5 });

    // Перемикаємо в 2.5D
    store.setViewMode('2.5D');
    expect(useGardenPlannerStore.getState().viewMode).toBe('2.5D');
    expect(useGardenPlannerStore.getState().selectedIds).toEqual(['srv-1']);
    expect(useGardenPlannerStore.getState().camera3D.yawDeg).toBe(45);
    expect(useGardenPlannerStore.getState().camera3D.pitchDeg).toBe(60);

    // Перемикаємо в 3D
    store.setViewMode('3D');
    expect(useGardenPlannerStore.getState().viewMode).toBe('3D');
    expect(useGardenPlannerStore.getState().selectedIds).toEqual(['srv-1']);

    // Повертаємося в 2D
    store.setViewMode('2D');
    expect(useGardenPlannerStore.getState().viewMode).toBe('2D');
    expect(useGardenPlannerStore.getState().selectedIds).toEqual(['srv-1']);
  });

  it('10. Зміна ракурсу камери чи пресету НЕ позначає план як dirty і не запускає автозбереження', () => {
    const store = useGardenPlannerStore.getState();
    expect(store.dirtyIds).toHaveLength(0);
    expect(store.saveStatus).toBe('idle');

    // Обертаємо камеру
    store.setCamera3D({ yawDeg: 120, pitchDeg: 30 });
    expect(useGardenPlannerStore.getState().dirtyIds).toHaveLength(0);
    expect(useGardenPlannerStore.getState().saveStatus).toBe('idle');

    // Застосовуємо пресет
    store.applyCameraPreset('isometric');
    expect(useGardenPlannerStore.getState().dirtyIds).toHaveLength(0);
    expect(useGardenPlannerStore.getState().saveStatus).toBe('idle');

    // Скидаємо камеру
    store.resetCamera3D();
    expect(useGardenPlannerStore.getState().dirtyIds).toHaveLength(0);
    expect(useGardenPlannerStore.getState().saveStatus).toBe('idle');
  });

  it('11. Перехід "Редагувати в 2D" повертає в 2D зі збереженим виділенням', () => {
    const store = useGardenPlannerStore.getState();
    store.setViewMode('3D');
    store.select('srv-1');

    // Імітуємо дію кнопки "Редагувати в 2D"
    store.setViewMode('2D');
    expect(useGardenPlannerStore.getState().viewMode).toBe('2D');
    expect(useGardenPlannerStore.getState().selectedIds).toEqual(['srv-1']);
    expect(useGardenPlannerStore.getState().objects['srv-1']).toBeDefined();
  });
});

