import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@smart-garden/api-client';
import type { BatchPlanObjectsDto, PlanObjectOperationDto } from '@smart-garden/types';
import { api, newIdempotencyKey } from '@/src/lib/api';
import { useGardenPlannerStore } from '../store/use-planner-store';
import { plannerDraftStore } from '../utils/planner-draft';
import type { SaveStatus } from '../types';
export type { SaveStatus };

export function usePlannerAutosave(gardenId: string, planId: string | null) {
  const queryClient = useQueryClient();

  const saveStatus = useGardenPlannerStore((s) => s.saveStatus);
  const setSaveStatus = useGardenPlannerStore((s) => s.setSaveStatus);
  const applyIdMap = useGardenPlannerStore((s) => s.applyIdMap);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const hasPendingSaveRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const performSave = useCallback(async () => {
    if (!planId) return;

    if (isSavingRef.current) {
      hasPendingSaveRef.current = true;
      return;
    }

    const currentStore = useGardenPlannerStore.getState();
    if (currentStore.saveStatus !== 'dirty') return;

    isSavingRef.current = true;
    if (isMountedRef.current) {
      setSaveStatus('saving');
    }

    // Save local draft before attempting network request
    void plannerDraftStore.saveDraft(planId, {
      plan: currentStore.plan,
      objects: currentStore.objects,
      dirtyIds: currentStore.dirtyIds,
    });

    const ops: PlanObjectOperationDto[] = [];
    const dirtyIds = currentStore.dirtyIds;
    const targetObjects =
      dirtyIds.length > 0
        ? dirtyIds
            .map((id) => currentStore.objects[id])
            .filter((o): o is NonNullable<typeof o> => Boolean(o))
        : Object.values(currentStore.objects);

    for (const obj of targetObjects) {
      if (obj.deleted) {
        if (!obj.isNew) {
          ops.push({
            op: 'delete',
            id: obj.id,
          });
        }
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

    const payload: BatchPlanObjectsDto = {
      version: currentStore.plan.version,
      planUpdate: {
        name: currentStore.plan.name,
        widthCm: currentStore.plan.widthCm,
        heightCm: currentStore.plan.heightCm,
        boundary: currentStore.plan.boundary,
        northAngleDeg: currentStore.plan.northAngleDeg,
        gridSizeCm: currentStore.plan.gridSizeCm,
      },
      objects: ops,
    };

    abortControllerRef.current = new AbortController();

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const response = await api.saveGardenPlanObjects(
          planId,
          payload,
          newIdempotencyKey('save-plan'),
        );

        if (!isMountedRef.current) return;

        applyIdMap(response.idMap, response.plan.version);
        setSaveStatus('saved');
        void plannerDraftStore.clearDraft(planId);

        // Точкове оновлення кешу
        void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans'] });
        void queryClient.invalidateQueries({ queryKey: ['plans', planId] });
        void queryClient.invalidateQueries({ queryKey: ['zones'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;
      } catch (err: unknown) {
        if (err instanceof ApiClientError && err.statusCode === 409) {
          if (isMountedRef.current) {
            setSaveStatus('error', 'Конфлікт: план оновлено на сервері іншим пристроєм');
          }
          break;
        }

        // Retry on network errors
        if (retryCount < maxRetries && !(err instanceof ApiClientError && err.statusCode >= 400 && err.statusCode < 500)) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 800 * retryCount));
          continue;
        }

        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Помилка збереження';
          setSaveStatus('error', msg);
        }
        break;
      }
    }

    isSavingRef.current = false;

    // Якщо за час збереження надійшли нові зміни, запускаємо повторне збереження
    if (hasPendingSaveRef.current) {
      hasPendingSaveRef.current = false;
      void performSave();
    }
  }, [planId, gardenId, queryClient, setSaveStatus, applyIdMap]);

  // Debounce 1.5s на зміни
  useEffect(() => {
    if (saveStatus !== 'dirty') return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void performSave();
    }, 1500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [saveStatus, performSave]);

  return {
    saveNow: performSave,
    saveChanges: performSave,
    isSaving: saveStatus === 'saving',
    saveStatus,
  };
}
