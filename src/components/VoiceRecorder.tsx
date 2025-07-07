'use client';

import React, { useState, useEffect } from 'react';
import MicRecorder from 'mic-recorder-to-mp3';

const recorder = new MicRecorder({ bitRate: 128 });

interface VoiceChatProps {
  setMessages: React.Dispatch<React.SetStateAction<{ role: string; text: string }[]>>;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ setMessages }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      setError('🎙️ Microphone access denied. Please allow access to use voice chat.');
    });
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      await recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('❌ Failed to start recording. Please try again.');
      console.error(err);
    }
  };

  const stopRecording = async () => {
    try {
      const [, blob] = await recorder.stop().getMp3();
      setIsRecording(false);

      if (blob.size === 0) {
        setError('❌ Empty audio. Please speak clearly.');
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
        throw new Error('Speech-to-text failed. Try again later.');
      }

      const sttData = await sttRes.json();
      const userText = sttData.text?.trim();

      if (!userText) {
        setError('🛑 Could not understand your voice. Try speaking more clearly.');
        return;
      }

      console.log('🗣️ You said:', userText);
      setMessages((prev) => [...prev, { role: 'user', text: userText }]);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: 'dummy-user', message: userText }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to stream GPT response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
      }

      if (!fullResponse.trim()) {
        setError('GPT returned an empty response.');
        return;
      }

      console.log('🤖 GPT Full Reply:', fullResponse);

      const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullResponse,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.7,
          },
        }),
      });

      if (!ttsRes.ok) {
        const errorText = await ttsRes.text();
        console.error('🛑 ElevenLabs TTS failed:', errorText);
        throw new Error('Text-to-speech failed. Try again later.');
      }

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(`❌ ${err.message}`);
      } else {
        setError('❌ Something went wrong during voice interaction.');
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>🎙️ Voice Chat with AI</h2>

      <button
        onClick={toggleRecording}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isRecording ? '#ff4d4d' : '#4CAF50',
          color: 'white',
          fontSize: '24px',
          boxShadow: isRecording ? '0 0 10px 3px red' : '0 0 8px 2px #4CAF50',
          animation: isRecording ? 'pulse 1s infinite' : 'none',
          cursor: 'pointer',
        }}
      >
        {isRecording ? '🛑' : '🎤'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceChat;
