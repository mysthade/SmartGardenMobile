import { useGardenPlannerStore } from '../store/use-planner-store';
import type { GardenPlanDetailsDto, GardenPlanDto } from '@smart-garden/types';

describe('Garden Planner Store & History Tests', () => {
  const dummyPlan: GardenPlanDetailsDto = {
    id: 'plan-101',
    gardenId: 'garden-1',
    name: 'Тестовий план',
    widthCm: 2000,
    heightCm: 1500,
    boundary: [
      { xCm: 0, yCm: 0 },
      { xCm: 2000, yCm: 0 },
      { xCm: 2000, yCm: 1500 },
      { xCm: 0, yCm: 1500 },
    ],
    northAngleDeg: 0,
    gridSizeCm: 50,
    version: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    objects: [],
  };

  const allPlans: GardenPlanDto[] = [dummyPlan];

  beforeEach(() => {
    useGardenPlannerStore.getState().hydrate(dummyPlan, allPlans, 'Мій сад');
  });

  it('коректно гідратує початковий стан плану', () => {
    const state = useGardenPlannerStore.getState();
    expect(state.plan.id).toBe('plan-101');
    expect(state.plan.widthCm).toBe(2000);
    expect(state.plan.heightCm).toBe(1500);
    expect(state.objectIds).toHaveLength(0);
    expect(state.saveStatus).toBe('idle');
  });

  it('додає обʼєкт із пресету (GAZEBO) у центр ділянки та фіксує у dirtyIds', () => {
    const store = useGardenPlannerStore.getState();
    const newId = store.addObjectFromPreset('GAZEBO');

    const updated = useGardenPlannerStore.getState();
    expect(updated.objectIds).toContain(newId);
    expect(updated.dirtyIds).toContain(newId);
    expect(updated.selectedIds).toEqual([newId]);

    const obj = updated.objects[newId]!;
    expect(obj.type).toBe('GAZEBO');
    expect(obj.widthCm).toBe(300);
    expect(obj.heightCm).toBe(300);
    expect(updated.saveStatus).toBe('dirty');
  });

  it('підтримує undo та redo для створених обʼєктів', () => {
    const store = useGardenPlannerStore.getState();
    const newId = store.addObjectFromPreset('SHED');

    expect(useGardenPlannerStore.getState().objectIds).toContain(newId);

    // Undo -> обʼєкт зникає
    useGardenPlannerStore.getState().undo();
    expect(useGardenPlannerStore.getState().objectIds).not.toContain(newId);

    // Redo -> обʼєкт повертається
    useGardenPlannerStore.getState().redo();
    expect(useGardenPlannerStore.getState().objectIds).toContain(newId);
  });

  it('переміщує вибраний обʼєкт з урахуванням кроку сітки', () => {
    const store = useGardenPlannerStore.getState();
    const newId = store.addObjectFromPreset('TREE', { xCm: 100, yCm: 100 });
    store.select(newId);

    store.moveSelected(100, 50);

    const updated = useGardenPlannerStore.getState().objects[newId]!;
    expect(updated.xCm).toBe(200);
    expect(updated.yCm).toBe(150);
  });

  it('дублює вибраний обʼєкт зі зміщенням', () => {
    const store = useGardenPlannerStore.getState();
    const newId = store.addObjectFromPreset('WELL', { xCm: 300, yCm: 300 });
    store.select(newId);

    store.duplicateSelected();

    const state = useGardenPlannerStore.getState();
    expect(state.objectIds).toHaveLength(2);
    expect(state.selectedIds).toHaveLength(1);
    const duplicatedId = state.selectedIds[0]!;
    expect(duplicatedId).not.toBe(newId);

    const dup = state.objects[duplicatedId]!;
    expect(dup.type).toBe('WELL');
    expect(dup.xCm).toBe(350); // 300 + 50 крок
    expect(dup.yCm).toBe(350);
  });

  it('видаляє обʼєкт: нові видаляє одразу, збережені маркує як deleted', () => {
    const store = useGardenPlannerStore.getState();
    const newId = store.addObjectFromPreset('BBQ');
    store.select(newId);
    store.deleteSelected();

    // Оскільки новий (isNew) — видалений з мапи
    expect(useGardenPlannerStore.getState().objects[newId]).toBeUndefined();

    // Гідратуємо зі збереженим обʼєктом
    const planWithObj: GardenPlanDetailsDto = {
      ...dummyPlan,
      objects: [
        {
          id: 'server-obj-1',
          planId: 'plan-101',
          type: 'HOUSE',
          label: 'Будинок',
          xCm: 100,
          yCm: 100,
          widthCm: 800,
          heightCm: 600,
          rotationDeg: 0,
          zIndex: 1,
          layer: 'BUILDINGS',
          color: null,
          locked: false,
          meta: null,
          zoneId: null,
          plantId: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    useGardenPlannerStore.getState().hydrate(planWithObj, allPlans);
    useGardenPlannerStore.getState().select('server-obj-1');
    useGardenPlannerStore.getState().deleteSelected();

    const afterDelete = useGardenPlannerStore.getState();
    expect(afterDelete.objects['server-obj-1']?.deleted).toBe(true);
    expect(afterDelete.dirtyIds).toContain('server-obj-1');
  });

  it('додає та переміщує вершини межі ділянки (Boundary Editor)', () => {
    const store = useGardenPlannerStore.getState();
    expect(store.plan.boundary).toHaveLength(4);

    // Додаємо вершину посередині першого ребра (0,0 -> 2000,0)
    store.insertBoundaryVertex(0, { xCm: 1000, yCm: 200 });
    const afterInsert = useGardenPlannerStore.getState();
    expect(afterInsert.plan.boundary).toHaveLength(5);
    expect(afterInsert.plan.boundary![1]).toEqual({ xCm: 1000, yCm: 200 });

    // Видаляємо щойно додану вершину
    store.deleteBoundaryVertex(1);
    const afterDelete = useGardenPlannerStore.getState();
    expect(afterDelete.plan.boundary).toHaveLength(4);
  });

  it('підтримує створення лінійних обʼєктів (FENCE/PATH)', () => {
    const store = useGardenPlannerStore.getState();
    store.startDrawingLine('FENCE');
    store.addDrawingLinePoint({ xCm: 0, yCm: 100 });
    store.addDrawingLinePoint({ xCm: 500, yCm: 100 });
    store.finishDrawingLine();

    const state = useGardenPlannerStore.getState();
    expect(state.objectIds).toHaveLength(1);
    const lineObj = state.objects[state.objectIds[0]!]!;
    expect(lineObj.type).toBe('FENCE');
    expect(lineObj.meta?.linePoints).toHaveLength(2);
  });

  it('applyIdMap коректно замінює клієнтські ID на серверні ID після збереження', () => {
    const store = useGardenPlannerStore.getState();
    const tempId = store.addObjectFromPreset('GREENHOUSE');

    store.applyIdMap({ [tempId]: 'server-greenhouse-uuid' }, 2);

    const state = useGardenPlannerStore.getState();
    expect(state.objects[tempId]).toBeUndefined();
    expect(state.objects['server-greenhouse-uuid']).toBeDefined();
    expect(state.objects['server-greenhouse-uuid']?.type).toBe('GREENHOUSE');
    expect(state.plan.version).toBe(2);
    expect(state.saveStatus).toBe('saved');
    expect(state.dirtyIds).toHaveLength(0);
  });
});
