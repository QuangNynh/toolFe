import api from '@/config/axios'

export interface TikTokResponse {
  success: boolean
  videoUrl?: string
  audioUrl?: string
  title?: string
  error?: string
  blob?: Blob
}

export interface TikTokChannelVideo {
  id: string
  url: string
  title: string
}

export interface TikTokChannelResponse {
  success: boolean
  videos?: TikTokChannelVideo[]
  error?: string
}

class TikTokService {
  async getChannelVideos(url: string): Promise<TikTokChannelResponse> {
    try {
      const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}tiktok/channel-videos`, {
        url
      })
      
      // The API response might wrap the videos array directly or in a field.
      // We handle different styles robustly.
      const data = response.data
      if (Array.isArray(data)) {
        return { success: true, videos: data }
      }
      
      return {
        success: data?.success ?? true,
        videos: data?.videos || data?.data || [],
        error: data?.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getAudio(url: string): Promise<TikTokResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}tiktok/audio`,
        { url },
        {
          responseType: 'blob'
        }
      )

      const contentDisposition = response.headers['content-disposition']
      let filename = 'tiktok_audio.mp3'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      return {
        success: true,
        blob: response.data,
        title: filename.replace('.mp3', ''),
        audioUrl: URL.createObjectURL(response.data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getVideo(url: string): Promise<TikTokResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}tiktok/video`,
        { url },
        {
          responseType: 'blob'
        }
      )

      const contentDisposition = response.headers['content-disposition']
      let filename = 'tiktok_video.mp4'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      return {
        success: true,
        blob: response.data,
        title: filename.replace('.mp4', ''),
        videoUrl: URL.createObjectURL(response.data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const tiktokService = new TikTokService()
