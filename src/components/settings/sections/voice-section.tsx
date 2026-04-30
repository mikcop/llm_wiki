import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SettingsDraft, DraftSetter } from "../settings-types"

interface Props {
  draft: SettingsDraft
  setDraft: DraftSetter
}

export function VoiceSection({ draft, setDraft }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Voice / Dictation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adds a mic button in the chat input. Click → record → release. Audio is sent to an
          OpenAI-compatible <code>/v1/audio/transcriptions</code> endpoint (e.g. oMLX serving
          Parakeet, faster-whisper-server). The transcript is appended to the textarea — you
          can edit before sending.
        </p>
      </div>

      <div
        className={`flex items-center justify-between rounded-md border-2 p-3 transition-colors ${
          draft.voiceEnabled
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-background"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Enable voice input</div>
          <div className="text-xs text-muted-foreground">
            Off: chat input shows no mic button. On: mic button appears next to the textarea.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDraft("voiceEnabled", !draft.voiceEnabled)}
          role="switch"
          aria-checked={draft.voiceEnabled}
          aria-label="Enable voice input"
          className="ml-3 flex shrink-0 items-center gap-2"
        >
          <span
            className={`text-xs font-semibold ${
              draft.voiceEnabled ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {draft.voiceEnabled ? "ON" : "OFF"}
          </span>
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              draft.voiceEnabled ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                draft.voiceEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice-baseurl">STT server base URL</Label>
        <Input
          id="voice-baseurl"
          type="text"
          placeholder="http://127.0.0.1:8000"
          value={draft.voiceBaseUrl}
          onChange={(e) => setDraft("voiceBaseUrl", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Without the <code>/v1</code> suffix — the client appends{" "}
          <code>/v1/audio/transcriptions</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice-model">STT model</Label>
        <Input
          id="voice-model"
          type="text"
          placeholder="parakeet-tdt-0.6b-v3"
          value={draft.voiceSttModel}
          onChange={(e) => setDraft("voiceSttModel", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice-key">API key</Label>
        <Input
          id="voice-key"
          type="password"
          placeholder="leave blank for unauthenticated local server"
          value={draft.voiceApiKey}
          onChange={(e) => setDraft("voiceApiKey", e.target.value)}
        />
      </div>
    </div>
  )
}
