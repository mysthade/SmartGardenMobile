import * as SecureStore from 'expo-secure-store';

const DRAFT_PREFIX = 'sg_planner_draft_';

// In-memory fallback if SecureStore fails on web or size limits
const memoryDrafts = new Map<string, string>();

export const plannerDraftStore = {
  async saveDraft(planId: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data);
    memoryDrafts.set(planId, json);
    try {
      await SecureStore.setItemAsync(`${DRAFT_PREFIX}${planId}`, json);
    } catch {
      // SecureStore may fail on large drafts or web preview; memoryDrafts acts as backup
    }
  },

  async loadDraft<T = unknown>(planId: string): Promise<T | null> {
    try {
      const stored = await SecureStore.getItemAsync(`${DRAFT_PREFIX}${planId}`);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch {
      /* fallback to memory */
    }

    const mem = memoryDrafts.get(planId);
    if (mem) {
      try {
        return JSON.parse(mem) as T;
      } catch {
        return null;
      }
    }
    return null;
  },

  async clearDraft(planId: string): Promise<void> {
    memoryDrafts.delete(planId);
    try {
      await SecureStore.deleteItemAsync(`${DRAFT_PREFIX}${planId}`);
    } catch {
      /* ignore */
    }
  },
};
