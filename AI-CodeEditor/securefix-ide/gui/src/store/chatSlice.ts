import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingMessageId: string | null;
  context: {
    currentFile?: string;
    selectedVulnerability?: string;
    recentFix?: string;
  };
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  streamingMessageId: null,
  context: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action: PayloadAction<{ id: string; content: string; isStreaming?: boolean }>) => {
      const message = state.messages.find(m => m.id === action.payload.id);
      if (message) {
        message.content = action.payload.content;
        if (action.payload.isStreaming !== undefined) {
          message.isStreaming = action.payload.isStreaming;
        }
      }
    },
    appendToMessage: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const message = state.messages.find(m => m.id === action.payload.id);
      if (message) {
        message.content += action.payload.content;
      }
    },
    setStreamingMessageId: (state, action: PayloadAction<string | null>) => {
      state.streamingMessageId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setContext: (state, action: PayloadAction<Partial<ChatState['context']>>) => {
      state.context = { ...state.context, ...action.payload };
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    clearContext: (state) => {
      state.context = {};
    },
  },
});

export const {
  addMessage,
  updateMessage,
  appendToMessage,
  setStreamingMessageId,
  setLoading,
  setContext,
  clearMessages,
  clearContext,
} = chatSlice.actions;

export default chatSlice.reducer;

// Selectors
export const selectMessages = (state: { chat: ChatState }) => state.chat.messages;
export const selectIsLoading = (state: { chat: ChatState }) => state.chat.isLoading;
export const selectStreamingMessageId = (state: { chat: ChatState }) => state.chat.streamingMessageId;
export const selectContext = (state: { chat: ChatState }) => state.chat.context;
