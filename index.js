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
    const response = await axios.post('https://openapi.akool.com/api/open/v3/getToken', {
      clientId: process.env.AKOOL_CLIENT_ID,
      clientSecret: process.env.AKOOL_CLIENT_SECRET
    });
    akoolToken = response.data?.token;
    // Set expiry to 1 hour from now (adjust if API provides expiry)
    akoolTokenExpires = now + 3600 * 1000;
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
    const avatars = response.data?.data?.result || [];
    res.json({ avatars });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
});

// --- Generate Testimonial Video ---
app.post('/api/generate', async (req, res) => {
  console.log('Received /api/generate request:', req.body);
  const { testimonial, voiceId, avatarId } = req.body;
  try {
    // Log input
    console.log('Generating video with:', { testimonial, voiceId, avatarId });

    // 1. Get TTS audio from TTSOpenAI
    console.log('Requesting TTS audio from TTSOpenAI...');
    let audioBuffer;
    try {
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
      audioBuffer = Buffer.from(ttsResponse.data, 'binary');
      console.log('TTS audio generated');
    } catch (ttsErr) {
      let errorMsg = ttsErr.response?.data;
      if (Buffer.isBuffer(errorMsg)) {
        errorMsg = errorMsg.toString('utf8');
      }
      console.error('TTSOpenAI API error:', errorMsg || ttsErr.message);
      return res.status(500).json({ error: 'Failed to generate video', details: 'TTSOpenAI API error: ' + (errorMsg || ttsErr.message) });
    }

    // 2. Send audio + avatar to Akool for video generation (v3)
    console.log('Requesting video generation from Akool...');
    const token = await getAkoolToken();
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('audioFile', audioBuffer, 'audio.wav'); // v3 expects 'audioFile'
    formData.append('avatarId', avatarId);                  // v3 expects 'avatarId'
    formData.append('webhookUrl', 'https://aitestimonialmaker.onrender.com/api/akool-webhook'); // required by Akool v3

    try {
      const akoolResponse = await axios.post(
        'https://openapi.akool.com/api/open/v3/talking-head/generate',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('Akool video generation response:', akoolResponse.data);
      res.json({ videoUrl: akoolResponse.data.video_url || akoolResponse.data.data?.videoUrl });
    } catch (akoolErr) {
      if (akoolErr.response && akoolErr.response.data) {
        const data = akoolErr.response.data;
        if (Buffer.isBuffer(data)) {
          console.error('Akool API error:', data.toString('utf8'));
        } else {
          console.error('Akool API error:', data);
        }
        return res.status(500).json({ error: 'Failed to generate video', details: 'Akool API error: ' + (Buffer.isBuffer(data) ? data.toString('utf8') : JSON.stringify(data)) });
      } else {
        console.error('Akool API error:', akoolErr.message);
        return res.status(500).json({ error: 'Failed to generate video', details: 'Akool API error: ' + akoolErr.message });
      }
    }
  } catch (err) {
    // Improved error logging
    if (err.response && err.response.data) {
      const data = err.response.data;
      if (Buffer.isBuffer(data)) {
        console.error('Error in /api/generate:', data.toString('utf8'));
      } else {
        console.error('Error in /api/generate:', data);
      }
    } else {
      console.error('Error in /api/generate:', err.message);
    }
    res.status(500).json({ error: 'Failed to generate video', details: err.message });
  }
});

// --- Akool Webhook Endpoint ---
app.post('/api/akool-webhook', express.json(), (req, res) => {
  console.log('Received Akool webhook:', req.body);
  // You can process/store the video URL or status here
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 