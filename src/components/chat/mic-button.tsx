import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWikiStore } from "@/stores/wiki-store"
import { transcribeAudio } from "@/lib/transcribe"

interface Props {
  onTranscribed: (text: string) => void
  disabled?: boolean
}

const CHUNK_MS = 2500

/**
 * Mic button for chat input.
 *
 * Live dictation: rotates MediaRecorder every CHUNK_MS so each
 * stop emits a self-contained blob. Each chunk is POSTed to the
 * configured STT endpoint and the resulting text is appended to
 * the textarea while the user is still talking.
 *
 * Why rotate instead of MediaRecorder timeslice: WebM emitted by
 * timeslice mode only carries the EBML header in chunk 0, so
 * downstream servers (ffmpeg-based) reject chunks 1..n. Rotation
 * gives every chunk a complete container at the cost of a ~50ms
 * gap between recorders — fine for dictation, sub-word.
 *
 * Hidden when voiceConfig.enabled is false.
 */
export function MicButton({ onTranscribed, disabled }: Props) {
  const voiceConfig = useWikiStore((s) => s.voiceConfig)
  const [recording, setRecording] = useState(false)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const rotateTimerRef = useRef<number | null>(null)
  const stoppingRef = useRef(false)
  const mimeRef = useRef<string>("")

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const transcribeChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1000) return
      setPending((n) => n + 1)
      try {
        const { text } = await transcribeAudio(blob, voiceConfig)
        if (text) onTranscribed(text)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setPending((n) => n - 1)
      }
    },
    [voiceConfig, onTranscribed],
  )

  const startRecorder = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const chunks: Blob[] = []
    const rec = mimeRef.current
      ? new MediaRecorder(stream, { mimeType: mimeRef.current })
      : new MediaRecorder(stream)
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" })
      void transcribeChunk(blob)
    }
    rec.start()
    recorderRef.current = rec
  }, [transcribeChunk])

  const rotate = useCallback(() => {
    if (stoppingRef.current) return
    const old = recorderRef.current
    if (old && old.state === "recording") {
      old.stop()
    }
    startRecorder()
  }, [startRecorder])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mimeRef.current = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : ""
      stoppingRef.current = false
      startRecorder()
      rotateTimerRef.current = window.setInterval(rotate, CHUNK_MS)
      setRecording(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      stopStream()
    }
  }, [rotate, startRecorder, stopStream])

  const stop = useCallback(() => {
    stoppingRef.current = true
    if (rotateTimerRef.current != null) {
      window.clearInterval(rotateTimerRef.current)
      rotateTimerRef.current = null
    }
    const rec = recorderRef.current
    if (rec && rec.state === "recording") rec.stop()
    recorderRef.current = null
    stopStream()
    setRecording(false)
  }, [stopStream])

  useEffect(() => {
    return () => {
      if (rotateTimerRef.current != null) window.clearInterval(rotateTimerRef.current)
      stopStream()
    }
  }, [stopStream])

  if (!voiceConfig.enabled) return null

  const busy = pending > 0
  const title = error
    ? `Mic error: ${error}`
    : recording
      ? "Stop recording"
      : busy
        ? `Transcribing... (${pending})`
        : "Record voice"

  return (
    <Button
      type="button"
      size="icon"
      variant={recording ? "destructive" : "ghost"}
      onClick={recording ? stop : start}
      disabled={disabled}
      title={title}
      className="shrink-0"
      aria-label={title}
    >
      {recording ? (
        <Square className="h-4 w-4" />
      ) : busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
