const BASE_URL = import.meta.env.VITE_SERVER_LOCAL

export interface ChatResponse {
  response: string
  model: string
}

class ChatService {
  async chat(
    prompt: string,
    model: string,
    onChunk?: (text: string) => void
  ): Promise<ChatResponse> {
    const response = await fetch(`${BASE_URL}chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ prompt, model })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No readable body stream')
    }

    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('data: ')) {
          const dataContent = trimmed.substring(6).trim()
          if (dataContent === '[DONE]') {
            continue
          }
          try {
            const parsed = JSON.parse(dataContent)
            if (parsed && typeof parsed.text === 'string') {
              fullText += parsed.text
              if (onChunk) {
                onChunk(parsed.text)
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', line, e)
          }
        }
      }
    }

    // Process any remaining buffer
    const trimmedBuffer = buffer.trim()
    if (trimmedBuffer.startsWith('data: ')) {
      const dataContent = trimmedBuffer.substring(6).trim()
      if (dataContent !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataContent)
          if (parsed && typeof parsed.text === 'string') {
            fullText += parsed.text
            if (onChunk) {
              onChunk(parsed.text)
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return {
      response: fullText,
      model
    }
  }
}

export const chatService = new ChatService()
