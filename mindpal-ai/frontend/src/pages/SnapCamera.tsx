import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = 'http://127.0.0.1:8000/api'

// API emotion -> app mood (happy, sad, stressed, calm, neutral)
function emotionToMood(emotion: string): string {
  const e = (emotion || '').toLowerCase()
  if (e === 'happy') return 'happy'
  if (e === 'neutral') return 'calm'
  if (e === 'sad') return 'sad'
  if (e === 'fear' || e === 'angry') return 'stressed'
  if (e === 'surprise') return 'neutral'
  return 'calm'
}

// Display label for "Detected mood: <Mood>"
function moodToDisplayLabel(mood: string): string {
  const m = (mood || '').toLowerCase()
  if (m === 'happy') return 'Happy'
  if (m === 'calm') return 'Calm'
  if (m === 'sad') return 'Sad'
  if (m === 'stressed') return 'Stressed'
  if (m === 'neutral') return 'Neutral'
  return mood || 'Calm'
}

const MOODS = ['happy', 'sad', 'stressed', 'calm', 'neutral'] as const

export default function SnapCamera() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const takePhotoInputRef = useRef<HTMLInputElement>(null)
  const uploadPhotoInputRef = useRef<HTMLInputElement>(null)
  const [mood, setMood] = useState<string>('')
  const [color, setColor] = useState<string>('')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string>('')

  const state = location.state as { mood?: string; color?: string } | null
  useEffect(() => {
    if (state?.mood) setMood(state.mood)
    if (state?.color) setColor(state.color)
    if (!state?.mood || !state?.color) {
      setError('Please choose mood and color on the Mood Snap page first.')
    }
  }, [state])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (e) {
      setCameraError('Camera access is needed to capture your snap. Please allow camera and try again.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (mood && color) startCamera()
    return () => stopCamera()
  }, [mood, color, startCamera, stopCamera])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) setCapturedBlob(blob)
      },
      'image/jpeg',
      0.9
    )
  }, [])

  const retake = useCallback(() => {
    setCapturedBlob(null)
  }, [])

  const clearUploaded = useCallback(() => {
    setUploadedImage(null)
    setAnalyzeError('')
  }, [])

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file)
      setAnalyzeError('')
      setCapturedBlob(null)
    }
    e.target.value = ''
  }, [])

  // Auto-analyze as soon as an image is captured or uploaded
  useEffect(() => {
    if (!uploadedImage || !token) return
    let cancelled = false
    setAnalyzing(true)
    setAnalyzeError('')
    const formData = new FormData()
    formData.append('image', uploadedImage, uploadedImage.name || 'image.jpg')
    fetch(`${API_BASE}/mood/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        return { res, data }
      })
      .then(({ res, data }) => {
        if (cancelled) return
        if (res.status === 422 && (data?.detail === 'no_face' || data?.detail?.includes('face'))) {
          setAnalyzeError('Face not detected, try again.')
          return
        }
        if (!res.ok) {
          setAnalyzeError('Analysis failed.')
          return
        }
        const emotion = data?.emotion
        if (emotion) setMood(emotionToMood(emotion))
      })
      .catch(() => {
        if (!cancelled) setAnalyzeError('Analysis failed.')
      })
      .finally(() => {
        if (!cancelled) setAnalyzing(false)
      })
    return () => { cancelled = true }
  }, [uploadedImage, token])

  const saveAndGoToForest = useCallback(async () => {
    const imagePayload = capturedBlob
      ? { blob: capturedBlob, name: 'snap.jpg' }
      : uploadedImage
        ? { blob: uploadedImage, name: uploadedImage.name || 'snap.jpg' }
        : null
    if (!imagePayload || !mood || !color || !token) return
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('mood', mood)
      formData.append('color', color)
      formData.append('image', imagePayload.blob, imagePayload.name)
      const res = await fetch(`${API_BASE}/daily-snaps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          setError('You already have a snap for today. Visit your forest to see it.')
          return
        }
        setError(data?.detail || 'Could not save snap. Please try again.')
        return
      }
      navigate('/mood-forest', { replace: true })
    } catch (e) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [capturedBlob, uploadedImage, mood, color, token, navigate])

  if (!mood || !color) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-mindpal-dark">Capture your snap</h1>
        {error && <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">{error}</p>}
        <button
          type="button"
          onClick={() => navigate('/snap')}
          className="px-4 py-2 bg-mindpal-primary text-white rounded-lg"
        >
          Go to Mood Snap
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-mindpal-dark">Capture your snap</h1>
      <p className="text-gray-600">
        Take a quick photo for today. You can retake until it feels right.
      </p>

      {cameraError && (
        <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">{cameraError}</p>
      )}
      {error && <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">{error}</p>}
      {analyzeError && <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">{analyzeError}</p>}

      <input
        ref={takePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-hidden
        className="hidden"
        onChange={onFileSelected}
      />
      <input
        ref={uploadPhotoInputRef}
        type="file"
        accept="image/*"
        aria-hidden
        className="hidden"
        onChange={onFileSelected}
      />

      {uploadedImage ? (
        <div className="space-y-4">
          <div className="aspect-[4/3] max-w-lg mx-auto bg-gray-100 rounded-xl overflow-hidden">
            <img
              src={URL.createObjectURL(uploadedImage)}
              alt="Your photo"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-sm text-gray-700 text-center">
            {analyzing ? 'Analyzing mood…' : mood ? `Detected mood: ${moodToDisplayLabel(mood)}` : null}
          </p>
          {mood && (
            <div className="flex flex-wrap gap-2 justify-center">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize border-2 transition-colors ${
                    mood === m ? 'border-mindpal-primary bg-mindpal-soft/40' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={saveAndGoToForest}
                disabled={saving}
                className="px-6 py-3 bg-mindpal-primary text-white rounded-xl font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save and go to forest'}
              </button>
              <button
                type="button"
                onClick={clearUploaded}
                disabled={saving}
                className="px-6 py-3 border border-gray-300 rounded-xl disabled:opacity-50"
              >
                Retake
              </button>
            </div>
          </div>
      ) : !capturedBlob ? (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] max-w-lg mx-auto bg-gray-900 rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-3 bg-mindpal-primary text-white rounded-xl font-medium"
            >
              Capture photo
            </button>
            <button
              type="button"
              onClick={() => takePhotoInputRef.current?.click()}
              className="px-6 py-3 border border-gray-300 rounded-xl"
            >
              Take Photo (Phone Camera)
            </button>
            <button
              type="button"
              onClick={() => uploadPhotoInputRef.current?.click()}
              className="px-6 py-3 border border-gray-300 rounded-xl"
            >
              Upload Photo
            </button>
            <button
              type="button"
              onClick={() => navigate('/snap')}
              className="px-6 py-3 border border-gray-300 rounded-xl"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="aspect-[4/3] max-w-lg mx-auto bg-gray-100 rounded-xl overflow-hidden">
            <img
              src={URL.createObjectURL(capturedBlob)}
              alt="Your snap"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={saveAndGoToForest}
              disabled={saving}
              className="px-6 py-3 bg-mindpal-primary text-white rounded-xl font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save and go to forest'}
            </button>
            <button
              type="button"
              onClick={retake}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 rounded-xl disabled:opacity-50"
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
