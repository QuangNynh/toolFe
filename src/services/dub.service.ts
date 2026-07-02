import axios from 'axios'

const BASE_URL = import.meta.env.VITE_SERVER_LOCAL

export interface DubVideoResponse {
  task_id: string
  status: string
  error?: string
}

export interface TaskStatusResponse {
  task_id: string
  status: string
}

class DubService {
  async dubVideo(
    file: File,
    voice: string,
    apiKey?: string,
    targetLanguage?: string
  ): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('voice', voice)
      if (apiKey) {
        formData.append('apiKey', apiKey)
      }
      if (targetLanguage) {
        formData.append('targetLanguage', targetLanguage)
      }

      const response = await axios.post(`${BASE_URL}media/translate-video`, formData, {
        headers: {
          accept: '*/*',
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
      })

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = `${file.name.replace(/\.[^/.]+$/, '')}_translated.mp4`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?="?(?:UTF-8'')?([^";\n]+)"?/i)
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1])
        } else {
          const simpleMatch = contentDisposition.match(/filename="?(.+?)"?$/)
          if (simpleMatch) {
            filename = decodeURIComponent(simpleMatch[1])
          }
        }
      }

      return {
        success: true,
        blob: response.data,
        filename
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          return {
            success: false,
            error: parsed.detail || parsed.message || parsed.error || 'Dịch và lồng tiếng video thất bại'
          }
        } catch {
          return {
            success: false,
            error: `Dịch và lồng tiếng video thất bại (${error.response.status})`
          }
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await axios.get(`${BASE_URL}api/task-status/${taskId}`, {
      headers: { accept: '*/*' }
    })
    return response.data
  }

  async downloadVideo(taskId: string): Promise<Blob> {
    const response = await axios.get(`${BASE_URL}api/download/${taskId}`, {
      responseType: 'blob',
      headers: { accept: '*/*' }
    })
    return response.data
  }
}

export const dubService = new DubService()
