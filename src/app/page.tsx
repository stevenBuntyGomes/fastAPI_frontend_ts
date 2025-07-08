'use client';

import VoiceChat from '@/components/VoiceRecorder';

export default function HomePage() {
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧠 Voice Chat with GPT</h1>
      <VoiceChat />
    </main>
  );
}
