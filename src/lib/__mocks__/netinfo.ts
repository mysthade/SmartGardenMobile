const listeners = new Set<(state: { isConnected: boolean; isInternetReachable: boolean | null }) => void>();

let currentState = {
  isConnected: true,
  isInternetReachable: true as boolean | null,
};

const NetInfo = {
  fetch: jest.fn(async () => currentState),
  refresh: jest.fn(async () => currentState),
  addEventListener: jest.fn((cb: (state: typeof currentState) => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }),
  __setMockState(next: Partial<typeof currentState>) {
    currentState = { ...currentState, ...next };
    for (const cb of listeners) {
      cb(currentState);
    }
  },
  __reset() {
    currentState = { isConnected: true, isInternetReachable: true };
    listeners.clear();
  },
};

export default NetInfo;

