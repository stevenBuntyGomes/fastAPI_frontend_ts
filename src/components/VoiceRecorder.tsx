'use client';

import React, { useState, useEffect } from 'react';
declare module 'mic-recorder-to-mp3';
import MicRecorder from 'mic-recorder-to-mp3';

const recorder = new MicRecorder({ bitRate: 128 });

interface VoiceChatProps {
  setMessages: React.Dispatch<React.SetStateAction<{ role: string; text: string }[]>>;
}
const VoiceChat: React.FC<VoiceChatProps> = ({ setMessages }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      setError('Microphone access denied. Please allow mic access to use voice chat.');
    });
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      await recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not start recording. Please try again.');
      console.error(err);
    }
  };

  const stopRecording = async () => {
    try {
      const [, blob] = await recorder.stop().getMp3();
      setIsRecording(false);

      if (blob.size === 0) {
        setError('Recording failed: empty audio data.');
        return;
      }

      const formData = new FormData();
      formData.append('file', blob, 'voice.mp3');
      formData.append('model_id', 'scribe_v1');

      const sttRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
        },
        body: formData,
      });

      if (!sttRes.ok) {
        const errorText = await sttRes.text();
        console.error('🛑 ElevenLabs STT failed:', errorText);
        throw new Error('Speech-to-text failed.');
      }

      const sttData = await sttRes.json();
      const userText: string = sttData.text;
      console.log('🗣️ User:', userText);

      setMessages((prev) => [...prev, { role: 'user', text: userText }]);

      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: 'dummy-user', message: userText }),
      });

      if (!backendRes.ok) throw new Error('Backend response failed.');
      const backendData = await backendRes.json();
      const gptReply: string = backendData.response;
      console.log('🤖 GPT:', gptReply);

      setResponseText(gptReply);
      setMessages((prev) => [...prev, { role: 'assistant', text: gptReply }]);

      const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: gptReply,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.7,
          },
        }),
      });

      if (!ttsRes.ok) throw new Error('Text-to-speech failed.');
      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
        setError(err.message || 'Something went wrong during voice interaction.');
      } else {
        console.error('Unknown error:', err);
        setError('Something went wrong during voice interaction.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🎙️ Voice Chat with AI</h2>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? '🛑 Stop Recording' : '🎤 Start Recording'}
      </button>

      {responseText && <p><strong>AI:</strong> {responseText}</p>}

      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}
    </div>
  );
};

export default VoiceChat;
