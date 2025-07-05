export const sendToBackend = async (userId: string, message: string) => {
  const response = await fetch('https://fastapi-ai-backend-v3u7.onrender.com/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, message }),
  });

  if (!response.ok) throw new Error('API Error');

  const data = await response.json();
  return data.response as string;
};
