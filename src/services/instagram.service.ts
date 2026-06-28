import api from '@/config/axios'

export interface InstagramInfoResponse {
  success: boolean
  title: string
  username: string
  fullname: string
  likes: number
  isVerified: boolean
  videoUrl: string
  thumbnailUrl: string
  width: number
  height: number
  views: number
  resultsNumber: number
  error?: string
}

export interface InstagramAudioResponse {
  success: boolean
  audioUrl?: string
  title?: string
  error?: string
  blob?: Blob
}

export interface InstagramVideoResponse {
  success: boolean
  videoUrl?: string
  title?: string
  error?: string
  blob?: Blob
}

class InstagramService {
  async getInfo(url: string): Promise<InstagramInfoResponse> {
    const response = await api.post(
      `${import.meta.env.VITE_SERVER_LOCAL}instagram/info`,
      { url }
    )
    return response.data
  }

  async getAudio(url: string): Promise<InstagramAudioResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}instagram/audio`,
        { url },
        {
          responseType: 'blob'
        }
      )

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'audio.mp3'
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

  async getVideo(url: string): Promise<InstagramVideoResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}instagram/video`,
        { url },
        {
          responseType: 'blob'
        }
      )

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'video.mp4'
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

  async getChannel(username: string, type?: string): Promise<InstagramChannelResponse> {
    const response = await api.post(
      `${import.meta.env.VITE_SERVER_LOCAL}instagram/channel`,
      { username },
      {
        params: { type }
      }
    )
    return response.data
  }
}

export interface InstagramChannelUser {
  username: string
  fullname: string
  profilePicUrl: string
  id: string
}

export interface InstagramChannelItem {
  id: string
  shortcode: string
  type: 'image' | 'video' | 'carousel'
  title: string
  videoUrl: string | null
  thumbnailUrl: string
  likes: number
  comments: number
  views: number
  takenAt: number
}

export interface InstagramChannelResponse {
  success: boolean
  user?: InstagramChannelUser
  items?: InstagramChannelItem[]
  error?: string
}

export const instagramService = new InstagramService()
