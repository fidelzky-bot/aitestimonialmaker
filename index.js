import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Akool OAuth2 Token Management ---
let akoolToken = null;
let akoolTokenExpires = 0;

async function getAkoolToken() {
  const now = Date.now();
  if (akoolToken && akoolTokenExpires > now + 60000) {
    return akoolToken;
  }
  try {
    const response = await axios.post('https://openapi.akool.com/oauth2/token', {
      client_id: process.env.AKOOL_CLIENT_ID,
      client_secret: process.env.AKOOL_CLIENT_SECRET,
      grant_type: 'client_credentials'
    });
    akoolToken = response.data.access_token;
    akoolTokenExpires = now + (response.data.expires_in * 1000);
    console.log('Akool token generated:', akoolToken);
    return akoolToken;
  } catch (err) {
    console.error('Failed to get Akool token:', err.response?.data || err.message);
    return null;
  }
}

// --- TTSOpenAI: Get Voices ---
// Static list based on TTSOpenAI documentation (update as needed)
const ttsVoices = [
  { voice_id: 'OA001', name: 'Alloy' },
  { voice_id: 'OA002', name: 'Echo' },
  { voice_id: 'OA003', name: 'Fable' },
  { voice_id: 'OA004', name: 'Onyx' },
  { voice_id: 'OA005', name: 'Nova' },
  { voice_id: 'OA006', name: 'Shimmer' }
];

app.get('/api/voices', (req, res) => {
  res.json({ voices: ttsVoices });
});

// --- Akool: Get Avatars ---
app.get('/api/avatars', async (req, res) => {
  try {
    const token = await getAkoolToken();
    console.log('Akool token used for avatar API:', token);
    const response = await axios.get('https://openapi.akool.com/api/open/v3/avatar/list?from=2&type=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Akool avatar API response:', response.data);
    const avatars = response.data?.data?.list || [];
    res.json({ avatars });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
});

// --- Generate Testimonial Video ---
app.post('/api/generate', async (req, res) => {
  const { testimonial, voiceId, avatarId } = req.body;
  try {
    // 1. Get TTS audio from TTSOpenAI
    const ttsResponse = await axios.post(
      'https://api.ttsopenai.com/uapi/v1/text-to-speech',
      {
        model: 'tts-1',
        voice_id: voiceId,
        speed: 1,
        input: testimonial
      },
      {
        headers: {
          'x-api-key': process.env.TTSOPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    const audioBuffer = Buffer.from(ttsResponse.data, 'binary');

    // 2. Send audio + avatar to Akool for video generation
    const token = await getAkoolToken();
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('audio', audioBuffer, 'audio.wav');
    formData.append('avatar_id', avatarId);
    formData.append('text', testimonial);

    const akoolResponse = await axios.post('https://openapi.akool.com/v1/talking-head/generate', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    res.json({ videoUrl: akoolResponse.data.video_url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate video', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 