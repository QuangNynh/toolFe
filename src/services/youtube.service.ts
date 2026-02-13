import api from '@/config/axios'

interface TranscriptItem {
  text: string
  duration: number
  offset: number
  lang: string
}

interface Thumbnail {
  url: string
  width: number
  height: number
}

interface Metadata {
  videoId: string
  title: string
  description: string
  author: string
  channelId: string
  thumbnails: Thumbnail[]
  durationSeconds: number
  viewCount: number
  likeCount: number
  isLive: boolean
  category: string
}

interface TranscriptResponse {
  success: boolean
  videoId: string
  transcript: TranscriptItem[]
  transcriptLanguage: string
  metadata: Metadata
  error?: string
}

interface AudioResponse {
  success: boolean
  videoId: string
  audioUrl?: string
  title?: string
  duration?: number
  error?: string
  blob?: Blob
}

class YouTubeService {
  async getTranscript(videoId: string): Promise<TranscriptResponse> {
    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/transcript`, {
      videoId
    })
    return response.data
  }

  async getTranscripts(videoIds: string[]): Promise<TranscriptResponse[]> {
    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/transcripts`, {
      videoIds
    })
    return response.data
  }

  async getAudio(url: string): Promise<AudioResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}youtube/audio`,
        { url },
        {
          responseType: 'blob'
        }
      )

      // Lấy filename từ Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'audio.mp3'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Trả về blob để download
      return {
        success: true,
        videoId: url,
        blob: response.data,
        title: filename.replace('.mp3', ''),
        audioUrl: URL.createObjectURL(response.data)
      }
    } catch (error) {
      return {
        success: false,
        videoId: url,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const youtubeService = new YouTubeService()

export type { TranscriptResponse, TranscriptItem, Metadata, Thumbnail, AudioResponse }
