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
}

export const youtubeService = new YouTubeService()

export type { TranscriptResponse, TranscriptItem, Metadata, Thumbnail }
