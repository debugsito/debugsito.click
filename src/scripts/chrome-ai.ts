/** Chrome built-in Prompt API (Gemini Nano) — progressive enhancement. */

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

declare global {
  // Minimal typings for Chrome LanguageModel Prompt API
  // eslint-disable-next-line no-var
  var LanguageModel:
    | {
        availability: (opts?: object) => Promise<Availability>;
        create: (opts?: {
          initialPrompts?: { role: string; content: string }[];
          monitor?: (m: EventTarget) => void;
          signal?: AbortSignal;
        }) => Promise<{
          prompt: (input: string) => Promise<string>;
          promptStreaming: (input: string) => AsyncIterable<string>;
          destroy: () => void;
        }>;
      }
    | undefined;
}

const SYSTEM = `Eres el asistente local de la homebase debugsito.click (Carlos / debugsito, Senior DevOps en Lima).
Responde en español, breve y concreto (máx. 6 líneas). Solo usa hechos de este contexto.
Si no sabes, dilo. No inventes URLs ni certificaciones.

Contexto del sitio:
- Rack live: grifos.debugsito.click (mapa de combustible Lima), salarios.debugsito.click (tesis/SHAP).
- Self-hosted: homebox-mcp (inventario casa, sin URL pública).
- Open source en GitHub: debugsito (claude-toolkit, scrap-sunat, grifos-lima, etc.).
- Shell guest abajo: ls/cd/cat/open/play. Arcade: deploy dodge.
- Bitácora: del backend a plataforma (agentes, Terraform, MCP).
- Contacto: csramosflores@gmail.com · linkedin/carlosrde · github/debugsito.`;

let session: Awaited<ReturnType<NonNullable<typeof LanguageModel>['create']>> | null = null;

export async function chromeAiStatus(): Promise<{
  ok: boolean;
  state: Availability | 'missing';
  detail: string;
}> {
  if (typeof LanguageModel === 'undefined') {
    return {
      ok: false,
      state: 'missing',
      detail: 'LanguageModel no está en este browser. Chrome 148+ desktop con Gemini Nano.',
    };
  }
  try {
    const state = await LanguageModel.availability();
    if (state === 'available') return { ok: true, state, detail: 'Gemini Nano listo (on-device).' };
    if (state === 'downloadable')
      return { ok: true, state, detail: 'Modelo disponible: se descarga al primer ask (on-device).' };
    if (state === 'downloading')
      return { ok: true, state, detail: 'Descargando Gemini Nano…' };
    return { ok: false, state, detail: 'Prompt API no disponible en este dispositivo.' };
  } catch (e) {
    return { ok: false, state: 'unavailable', detail: String(e) };
  }
}

export async function chromeAiAsk(
  question: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  if (typeof LanguageModel === 'undefined') {
    throw new Error('Prompt API ausente — usa Chrome reciente en desktop.');
  }
  const avail = await LanguageModel.availability();
  if (avail === 'unavailable') {
    throw new Error('Prompt API no soportada aquí (hardware/OS).');
  }

  if (!session) {
    session = await LanguageModel.create({
      initialPrompts: [{ role: 'system', content: SYSTEM }],
      monitor(m) {
        m.addEventListener('downloadprogress', ((e: Event & { loaded?: number }) => {
          onChunk?.(`[download ${(e.loaded ?? 0) * 100 | 0}%]`);
        }) as EventListener);
      },
    });
  }

  if (onChunk && session.promptStreaming) {
    let out = '';
    for await (const chunk of session.promptStreaming(question)) {
      out += chunk;
      onChunk(out);
    }
    return out.trim();
  }

  const text = await session.prompt(question);
  return String(text).trim();
}

export function chromeAiDestroy() {
  try {
    session?.destroy();
  } catch {
    /* ignore */
  }
  session = null;
}
