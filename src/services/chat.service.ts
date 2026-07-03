import axios from 'axios'

const BASE_URL = import.meta.env.VITE_SERVER_LOCAL

export interface ChatResponse {
  response: string
  model: string
}

class ChatService {
  async chat(prompt: string, model: string, apiKey: string): Promise<ChatResponse> {
    const response = await axios.post(`${BASE_URL}chat`, {
      prompt,
      model,
      apiKey
    }, {
      headers: {
        'Content-Type': 'application/json',
        accept: '*/*'
      }
    })
    return response.data
  }
}

export const chatService = new ChatService()
