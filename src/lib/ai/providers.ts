import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Fornitori AI intercambiabili. Le chiavi si leggono SOLO da variabili d'ambiente lato server.
 * Ogni provider espone complete(system, user) → testo + token usati.
 */
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'mistral' | 'openrouter' | 'ollama';

export const PROVIDERS: Record<ProviderId, { label: string; env: string; defaultModel: string; docs: string; free: string }> = {
  anthropic: { label: 'Anthropic Claude', env: 'ANTHROPIC_API_KEY', defaultModel: 'claude-opus-5-5', docs: 'https://console.anthropic.com/settings/keys', free: 'A pagamento (crediti prepagati). Modelli: claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5 (il più economico).' },
  openai: { label: 'OpenAI', env: 'OPENAI_API_KEY', defaultModel: 'gpt-4.1-mini', docs: 'https://platform.openai.com/api-keys', free: 'A pagamento.' },
  gemini: { label: 'Google Gemini', env: 'GEMINI_API_KEY', defaultModel: 'gemini-2.5-flash', docs: 'https://aistudio.google.com/apikey', free: 'Piano gratuito con limiti giornalieri.' },
  groq: { label: 'Groq', env: 'GROQ_API_KEY', defaultModel: 'llama-3.3-70b-versatile', docs: 'https://console.groq.com/keys', free: 'Piano gratuito con limiti al minuto/giorno.' },
  mistral: { label: 'Mistral', env: 'MISTRAL_API_KEY', defaultModel: 'mistral-small-latest', docs: 'https://console.mistral.ai/api-keys', free: 'Piano gratuito "Experiment" con limiti.' },
  openrouter: { label: 'OpenRouter', env: 'OPENROUTER_API_KEY', defaultModel: 'openrouter/auto', docs: 'https://openrouter.ai/keys', free: 'Alcuni modelli ":free" gratuiti.' },
  ollama: { label: 'Ollama (locale)', env: 'OLLAMA_URL', defaultModel: 'llama3.1', docs: 'https://ollama.com', free: 'Gratuito, gira sul tuo server.' },
};

export function providerConfigured(p: ProviderId) {
  return !!process.env[PROVIDERS[p].env];
}

export type Completion = { text: string; inputTokens: number; outputTokens: number; model: string };

let anthropicClient: Anthropic | null = null;

async function openAICompatible(base: string, key: string | null, model: string, system: string, user: string, json: boolean, extraHeaders: Record<string, string> = {}): Promise<Completion> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}), ...extraHeaders },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const r = (await res.json()) as any;
    return { text: r.choices?.[0]?.message?.content ?? '', inputTokens: r.usage?.prompt_tokens ?? 0, outputTokens: r.usage?.completion_tokens ?? 0, model: r.model ?? model };
  } finally {
    clearTimeout(t);
  }
}

export async function complete(p: ProviderId, model: string, system: string, user: string, json = true): Promise<Completion> {
  switch (p) {
    case 'anthropic': {
      anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 2 });
      const fallbackCapable = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(model);
      const r = await anthropicClient.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: user }],
        ...(fallbackCapable ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      });
      if (r.stop_reason === 'refusal') throw new Error('Richiesta rifiutata dal modello');
      const text = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      return { text, inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens, model: r.model };
    }
    case 'openai':
      return openAICompatible('https://api.openai.com/v1', process.env.OPENAI_API_KEY!, model, system, user, json);
    case 'groq':
      return openAICompatible('https://api.groq.com/openai/v1', process.env.GROQ_API_KEY!, model, system, user, json);
    case 'mistral':
      return openAICompatible('https://api.mistral.ai/v1', process.env.MISTRAL_API_KEY!, model, system, user, json);
    case 'openrouter':
      return openAICompatible('https://openrouter.ai/api/v1', process.env.OPENROUTER_API_KEY!, model, system, user, json, { 'X-Title': 'Stock Radar' });
    case 'ollama':
      return openAICompatible(process.env.OLLAMA_URL!.replace(/\/$/, '') + '/v1', null, model, system, user, json);
    case 'gemini': {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) },
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const r = (await res.json()) as any;
        const text = (r.candidates?.[0]?.content?.parts ?? []).map((x: any) => x.text ?? '').join('');
        return { text, inputTokens: r.usageMetadata?.promptTokenCount ?? 0, outputTokens: r.usageMetadata?.candidatesTokenCount ?? 0, model };
      } finally {
        clearTimeout(t);
      }
    }
  }
}
