'use client'

import { useState, useEffect } from 'react'

export default function SSEClient() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const eventSource = new EventSource('/api/soil-moisture')
    
    eventSource.onmessage = (e) => {
      setMessages(prev => [...prev, e.data])
    }
    
    eventSource.onerror = () => {
      eventSource.close()
      // Client will automatically attempt to reconnect
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return (
    <div>
      <h2>SSE Messages</h2>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  )
}