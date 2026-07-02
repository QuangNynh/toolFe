import axios from 'axios'

const BASE_URL = import.meta.env.VITE_SERVER_LOCAL

export interface GeminiVoice {
  id: string
  gender: string
  character: string
}

export interface VoicesResponse {
  voices: GeminiVoice[]
  total: number
}

export interface TtsGenerateResult {
  success: boolean
  blob?: Blob
  filename?: string
  error?: string
}

class TtsService {
  async getVoices(): Promise<VoicesResponse> {
    const response = await axios.get(`${BASE_URL}audio-tts/voices`, {
      headers: { accept: '*/*' }
    })
    return response.data
  }

  async generate(
    file: File,
    voice: string
  ): Promise<TtsGenerateResult> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('voice', voice)

      const response = await axios.post(`${BASE_URL}audio-tts/generate`, formData, {
        headers: {
          accept: '*/*',
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
      })

      // Try to get filename from Content-Disposition
      const contentDisposition = response.headers['content-disposition']
      let filename = `tts-${voice}.mp3`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?="?(?:UTF-8'')?([^";\n]+)"?/i)
        if (match) {
          filename = decodeURIComponent(match[1])
        }
      }

      return { success: true, blob: response.data, filename }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          return {
            success: false,
            error: parsed.message || parsed.error || 'TTS generation failed'
          }
        } catch {
          return {
            success: false,
            error: `TTS generation failed (${error.response.status})`
          }
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const ttsService = new TtsService()
