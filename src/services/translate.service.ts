import axios from 'axios'

const BASE_URL = import.meta.env.VITE_SERVER_LOCAL

interface ModelInfo {
  name: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
}

interface ModelsResponse {
  models: ModelInfo[]
}

interface TranslateSrtResponse {
  success: boolean
  blob?: Blob
  filename?: string
  error?: string
}

class TranslateService {
  async getModels(apiKey: string): Promise<ModelsResponse> {
    const response = await axios.get(`${BASE_URL}translate/models`, {
      params: { apiKey },
      headers: { accept: '*/*' }
    })
    return response.data
  }

  async translateSrt(
    file: File,
    targetLanguage: string,
    model: string,
    apiKey: string
  ): Promise<TranslateSrtResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetLanguage', targetLanguage)
      formData.append('model', model)
      formData.append('apiKey', apiKey)

      const response = await axios.post(`${BASE_URL}translate/srt`, formData, {
        headers: {
          accept: '*/*',
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
        timeout: 600000 // 10 minutes for large files
      })

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'translated.srt'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      return {
        success: true,
        blob: response.data,
        filename
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Try to read error message from blob response
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          return {
            success: false,
            error: parsed.message || parsed.error || 'Translation failed'
          }
        } catch {
          return {
            success: false,
            error: `Translation failed (${error.response.status})`
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

export const translateService = new TranslateService()
export type { ModelInfo, ModelsResponse, TranslateSrtResponse }
