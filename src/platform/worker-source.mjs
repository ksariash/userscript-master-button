// Embed one copy, shared by startup and the classifier constructor.
export const MODEL_WORKER_SOURCE = typeof __MODEL_WORKER__ === 'undefined' ? '' : __MODEL_WORKER__;
