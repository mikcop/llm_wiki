import { useCallback, useRef, useState } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWikiStore } from "@/stores/wiki-store"
import { transcribeAudio } from "@/lib/transcribe"

interface Props {
  onTranscribed: (text: string) => void
  disabled?: boolean
}

/**
 * Mic button for chat input.
 *
 * Click → start MediaRecorder. Click again → stop, POST blob to
 * the configured STT endpoint, hand the resulting text back to
 * the parent via onTranscribed (it appends to the textarea).
 *
 * Hidden when voiceConfig.enabled is false so the chat input
 * doesn't show a non-functional mic icon for users who don't
 * have a local STT server.
 */
export function MicButton({ onTranscribed, disabled }: Props) {
  const voiceConfig = useWikiStore((s) => s.voiceConfig)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : ""
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stopStream()
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" })
        chunksRef.current = []
        setBusy(true)
        try {
          const { text } = await transcribeAudio(blob, voiceConfig)
          if (text) onTranscribed(text)
          else setError("Empty transcript")
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setBusy(false)
        }
      }
      rec.start()
      recorderRef.current = rec
      setRecording(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      stopStream()
    }
  }, [voiceConfig, onTranscribed, stopStream])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }, [])

  if (!voiceConfig.enabled) return null

  const title = error
    ? `Mic error: ${error}`
    : recording
      ? "Stop recording"
      : busy
        ? "Transcribing..."
        : "Record voice"

  return (
    <Button
      type="button"
      size="icon"
      variant={recording ? "destructive" : "ghost"}
      onClick={recording ? stop : start}
      disabled={disabled || busy}
      title={title}
      className="shrink-0"
      aria-label={title}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
