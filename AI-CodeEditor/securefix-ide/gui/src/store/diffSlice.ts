import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DiffZone {
  id: string;
  fileUri: string;
  startLine: number;
  endLine: number;
  originalContent: string;
  suggestedContent: string;
  status: 'pending' | 'applied' | 'rejected' | 'streaming';
  vulnerabilityId: string;
  searchBlocks: string[];
  replaceBlocks: string[];
  filePath: string;
}

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: number;
}

interface FixStreamState {
  vulnerabilityId: string;
  content: string;
  isComplete: boolean;
  error: string | null;
}

interface DiffState {
  diffZones: DiffZone[];
  currentDiffZoneId: string | null;
  fixStream: FixStreamState | null;
}

const initialState: DiffState = {
  diffZones: [],
  currentDiffZoneId: null,
  fixStream: null,
};

const diffSlice = createSlice({
  name: 'diff',
  initialState,
  reducers: {
    addDiffZone: (state, action: PayloadAction<DiffZone>) => {
      state.diffZones.push(action.payload);
      state.currentDiffZoneId = action.payload.id;
    },
    updateDiffZone: (state, action: PayloadAction<Partial<DiffZone> & { id: string }>) => {
      const zone = state.diffZones.find(z => z.id === action.payload.id);
      if (zone) {
        Object.assign(zone, action.payload);
      }
    },
    removeDiffZone: (state, action: PayloadAction<string>) => {
      state.diffZones = state.diffZones.filter(z => z.id !== action.payload);
      if (state.currentDiffZoneId === action.payload) {
        state.currentDiffZoneId = null;
      }
    },
    setCurrentDiffZone: (state, action: PayloadAction<string | null>) => {
      state.currentDiffZoneId = action.payload;
    },
    applyDiffZone: (state, action: PayloadAction<string>) => {
      const zone = state.diffZones.find(z => z.id === action.payload);
      if (zone) {
        zone.status = 'applied';
      }
    },
    rejectDiffZone: (state, action: PayloadAction<string>) => {
      const zone = state.diffZones.find(z => z.id === action.payload);
      if (zone) {
        zone.status = 'rejected';
      }
    },
    startFixStream: (state, action: PayloadAction<string>) => {
      state.fixStream = {
        vulnerabilityId: action.payload,
        content: '',
        isComplete: false,
        error: null,
      };
    },
    appendFixStreamContent: (state, action: PayloadAction<string>) => {
      if (state.fixStream) {
        state.fixStream.content += action.payload;
      }
    },
    completeFixStream: (state) => {
      if (state.fixStream) {
        state.fixStream.isComplete = true;
      }
    },
    setFixStreamError: (state, action: PayloadAction<string>) => {
      if (state.fixStream) {
        state.fixStream.error = action.payload;
        state.fixStream.isComplete = true;
      }
    },
    clearFixStream: (state) => {
      state.fixStream = null;
    },
    clearAllDiffZones: (state) => {
      state.diffZones = [];
      state.currentDiffZoneId = null;
    },
    setDiffZones: (state, action: PayloadAction<DiffZone[]>) => {
      state.diffZones = action.payload;
    },
  },
});

export const {
  addDiffZone,
  updateDiffZone,
  removeDiffZone,
  setCurrentDiffZone,
  applyDiffZone,
  rejectDiffZone,
  startFixStream,
  appendFixStreamContent,
  completeFixStream,
  setFixStreamError,
  clearFixStream,
  clearAllDiffZones,
  setDiffZones,
} = diffSlice.actions;

export default diffSlice.reducer;

// Selectors
export const selectDiffZones = (state: { diff: DiffState }) => state.diff.diffZones;
export const selectCurrentDiffZone = (state: { diff: DiffState }) => {
  const { diffZones, currentDiffZoneId } = state.diff;
  return diffZones.find(z => z.id === currentDiffZoneId) || null;
};
export const selectFixStream = (state: { diff: DiffState }) => state.diff.fixStream;
export const selectPendingDiffZones = (state: { diff: DiffState }) =>
  state.diff.diffZones.filter(z => z.status === 'pending');
