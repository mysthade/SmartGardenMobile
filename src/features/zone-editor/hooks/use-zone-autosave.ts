import { ApiClientError, api, newIdempotencyKey } from '@/src/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useZoneEditorStore } from '../store';

const AUTOSAVE_DELAY_MS = 1500;

export function useZoneAutosave(zoneId: string) {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const state = useZoneEditorStore.getState();
      const plants = Object.values(state.plants).map((plant) => {
        if (plant.deleted) {
          return { op: 'delete' as const, id: plant.id };
        }
        return {
          op: 'upsert' as const,
          id: plant.isNew ? undefined : plant.id,
          clientId: plant.clientId ?? (plant.isNew ? plant.id : undefined),
          plantTypeId: plant.plantTypeId,
          name: plant.name,
          variety: plant.variety,
          quantity: plant.quantity,
          status: plant.status,
          plantedAt: plant.plantedAt,
          description: plant.description,
          positionX: String(plant.positionX),
          positionY: String(plant.positionY),
          size: String(plant.size),
          rotation: String(plant.rotation),
          version: plant.isNew ? undefined : plant.version,
        };
      });

      return api.saveBedLayout(
        zoneId,
        {
          zoneUpdatedAt: state.zone.updatedAt,
          bed: {
            name: state.zone.name,
            width: String(state.zone.widthM),
            height: String(state.zone.heightM),
          },
          settings: state.settings,
          plants,
        },
        newIdempotencyKey('zone-layout'),
      );
    },
    onMutate: () => {
      inflight.current = true;
      useZoneEditorStore.getState().setSaveStatus('saving');
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(['bed-layout', zoneId], result.layout);
      queryClient.setQueryData(['bed-layout', 'minimap', zoneId], result.layout);
      useZoneEditorStore.getState().applyIdMap(result.idMap, result.layout);
      useZoneEditorStore.getState().setSaveStatus('saved');
      await queryClient.invalidateQueries({ queryKey: ['bed-layout', 'minimap', zoneId] });
      await queryClient.invalidateQueries({ queryKey: ['plants', 'zone', zoneId] });
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      await queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: (err) => {
      const conflict =
        err instanceof ApiClientError && (err.statusCode === 409 || /інш/i.test(err.message));
      const message = conflict
        ? 'Дані були змінені в іншій вкладці'
        : err instanceof ApiClientError
          ? err.message
          : 'Не вдалося зберегти';
      useZoneEditorStore.getState().setSaveStatus('error', message);
    },
    onSettled: () => {
      inflight.current = false;
    },
  });

  const saveNow = useCallback(() => {
    if (inflight.current) {
      return;
    }
    void mutation.mutateAsync();
  }, [mutation]);

  const saveStatus = useZoneEditorStore((s) => s.saveStatus);
  const isDragging = useZoneEditorStore((s) => s.isDragging);

  useEffect(() => {
    if (saveStatus !== 'dirty' || isDragging) {
      return;
    }
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      saveNow();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [saveStatus, isDragging, saveNow]);

  return { saveNow, saving: mutation.isPending };
}
