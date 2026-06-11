/** Read and trim a server-side environment variable at request time. */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

export function getOpenAIApiKey(): string | undefined {
  return readEnv("OPENAI_API_KEY");
}

export function getOpenAIModel(defaultModel = "gpt-4o-mini"): string {
  return readEnv("OPENAI_MODEL") || defaultModel;
}

export function describeOpenAIEnv(): {
  hasKey: boolean;
  keyPreview: string | null;
  model: string;
  matchingEnvKeys: string[];
} {
  const key = getOpenAIApiKey();
  return {
    hasKey: Boolean(key),
    keyPreview: key ? `${key.slice(0, 7)}…${key.slice(-4)}` : null,
    model: getOpenAIModel(),
    matchingEnvKeys: Object.keys(process.env).filter((name) => name.toUpperCase().includes("OPENAI")),
  };
}
