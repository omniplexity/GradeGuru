const initialState = {
  bootstrapped: false,
  route: { name: 'dashboard', params: {} },
  dashboard: { upcomingAssignments: [], recentChats: [], activeProjects: [] },
  classes: [],
  assignments: [],
  currentClass: null,
  currentAssignment: null,
  currentChat: null,
  messages: [],
  assignmentView: 'overview',
  tools: [],
  toolOutput: '',
  models: [],
  selectedModel: null,
  settings: {},
  plugins: [],
  pendingChatAttachments: [],
  pendingToolResult: null,
  chatInput: '',
  isStreaming: false,
  streamMessageId: null,
};

export function createStore() {
  let state = structuredClone(initialState);
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(patch) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    update(updater) {
      state = updater(state);
      listeners.forEach((listener) => listener(state));
    },
  };
}

export function resetChatDraft(state) {
  return {
    ...state,
    chatInput: '',
    pendingChatAttachments: [],
  };
}
