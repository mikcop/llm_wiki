import type { VoiceConfig } from "@/stores/wiki-store"

export interface TranscribeResult {
  text: string
}

/**
 * Hits an OpenAI-compatible /v1/audio/transcriptions endpoint
 * (e.g. oMLX serving Parakeet, faster-whisper-server, vLLM).
 *
 * `cfg.baseUrl` should be the server root WITHOUT the /v1 suffix
 * — we append "/v1/audio/transcriptions" ourselves so users can
 * paste either form and we normalize.
 */
export async function transcribeAudio(
  blob: Blob,
  cfg: VoiceConfig,
): Promise<TranscribeResult> {
  if (!cfg.baseUrl) throw new Error("Voice baseUrl not configured")
  if (!cfg.sttModel) throw new Error("Voice sttModel not configured")

  const base = cfg.baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "")
  const url = `${base}/v1/audio/transcriptions`

  const form = new FormData()
  const ext = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "m4a" : "webm"
  form.append("file", blob, `audio.${ext}`)
  form.append("model", cfg.sttModel)

  const headers: Record<string, string> = {}
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`

  const res = await fetch(url, { method: "POST", headers, body: form })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`STT ${res.status}: ${txt || res.statusText}`)
  }
  const json = (await res.json()) as { text?: string }
  return { text: (json.text ?? "").trim() }
}
