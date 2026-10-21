import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateGardenPlanDto, UpdateGardenPlanDto } from '@smart-garden/types';
import { api, newIdempotencyKey } from '@/src/lib/api';

export function useGardenPlans(gardenId: string) {
  return useQuery({
    queryKey: ['gardens', gardenId, 'plans'],
    queryFn: () => api.listGardenPlans(gardenId),
    enabled: Boolean(gardenId),
    staleTime: 30_000,
  });
}

export function useActiveGardenPlan(gardenId: string) {
  return useQuery({
    queryKey: ['gardens', gardenId, 'plans', 'active'],
    queryFn: () => api.getActiveGardenPlan(gardenId),
    enabled: Boolean(gardenId),
    staleTime: 30_000,
  });
}

export function useGardenPlan(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['plans', planId],
    queryFn: () => (planId ? api.getGardenPlan(planId) : null),
    enabled: Boolean(planId),
    staleTime: 30_000,
  });
}

export function useCreatePlanMutation(gardenId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGardenPlanDto) =>
      api.createGardenPlan(gardenId, data, newIdempotencyKey('create-plan')),
    onSuccess: (newPlan) => {
      void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans'] });
      void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans', 'active'] });
      void queryClient.invalidateQueries({ queryKey: ['plans', newPlan.id] });
    },
  });
}

export function useUpdatePlanMutation(gardenId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: UpdateGardenPlanDto }) =>
      api.updateGardenPlan(planId, data),
    onSuccess: (_updated, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans'] });
      void queryClient.invalidateQueries({ queryKey: ['plans', vars.planId] });
    },
  });
}

export function useDeletePlanMutation(gardenId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.deleteGardenPlan(planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans'] });
      void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans', 'active'] });
    },
  });
}

export function useDuplicatePlanMutation(gardenId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) =>
      api.duplicateGardenPlan(planId, undefined, newIdempotencyKey('dup-plan')),
    onSuccess: (newPlan) => {
      void queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'plans'] });
      void queryClient.invalidateQueries({ queryKey: ['plans', newPlan.id] });
    },
  });
}

export const useCreateGardenPlan = useCreatePlanMutation;
export const useUpdateGardenPlan = useUpdatePlanMutation;
export const useDeleteGardenPlan = useDeletePlanMutation;
export const useDuplicateGardenPlan = useDuplicatePlanMutation;

