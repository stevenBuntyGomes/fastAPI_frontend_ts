'use client';

import { useState } from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function HomePage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧠 Voice Chat with GPT</h1>

      <div className="space-y-4 mb-8">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded text-white ${
              msg.role === 'user' ? 'bg-purple-600' : 'bg-green-600'
            }`}
          >
            <strong>{msg.role === 'user' ? 'You' : 'GPT'}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <VoiceRecorder setMessages={setMessages} />
    </main>
  );
}
