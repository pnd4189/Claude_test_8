import { create } from 'zustand';

export interface TranslationChunk {
  id: string;
  sourceText: string;
  targetText?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface TranslationJob {
  id: string;
  fileName?: string;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  model: string;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  chunks: TranslationChunk[];
  progress: number;
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface TranslationStore {
  currentJob: TranslationJob | null;
  jobs: TranslationJob[];
  isTranslating: boolean;

  // Actions
  createJob: (job: Omit<TranslationJob, 'id' | 'status' | 'progress' | 'createdAt' | 'chunks'>) => void;
  updateJob: (id: string, updates: Partial<TranslationJob>) => void;
  updateChunk: (jobId: string, chunkId: string, updates: Partial<TranslationChunk>) => void;
  setCurrentJob: (job: TranslationJob | null) => void;
  clearJob: (id: string) => void;
  clearAllJobs: () => void;
}

export const useTranslationStore = create<TranslationStore>((set, get) => ({
  currentJob: null,
  jobs: [],
  isTranslating: false,

  createJob: (jobData) => {
    const job: TranslationJob = {
      ...jobData,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'idle',
      progress: 0,
      chunks: [],
      createdAt: new Date(),
    };

    set((state) => ({
      jobs: [job, ...state.jobs],
      currentJob: job,
      isTranslating: true,
    }));
  },

  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      ),
      currentJob:
        state.currentJob?.id === id
          ? { ...state.currentJob, ...updates }
          : state.currentJob,
      isTranslating:
        updates.status === 'completed' || updates.status === 'failed'
          ? false
          : state.isTranslating,
    }));
  },

  updateChunk: (jobId, chunkId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              chunks: job.chunks.map((chunk) =>
                chunk.id === chunkId ? { ...chunk, ...updates } : chunk
              ),
            }
          : job
      ),
      currentJob:
        state.currentJob?.id === jobId
          ? {
              ...state.currentJob,
              chunks: state.currentJob.chunks.map((chunk) =>
                chunk.id === chunkId ? { ...chunk, ...updates } : chunk
              ),
            }
          : state.currentJob,
    }));
  },

  setCurrentJob: (job) => set({ currentJob: job }),

  clearJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      currentJob: state.currentJob?.id === id ? null : state.currentJob,
    })),

  clearAllJobs: () =>
    set({
      jobs: [],
      currentJob: null,
      isTranslating: false,
    }),
}));
