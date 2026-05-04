/** Shared model filters for OpenRouter free model selection */

export const FREE_MODEL_FILTERS = [
  ':free',
  'qwen',
  'deepseek',
  'kimi',
  'glm',
  'phi',
  'gemma',
];

export function shouldIncludeModel(modelId: string): boolean {
  const lowerCaseId = modelId.toLowerCase();
  return FREE_MODEL_FILTERS.some((filter) => lowerCaseId.includes(filter));
}
