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

// --- TTSOpenAI: Get Voices ---
app.get('/api/voices', async (req, res) => {
  try {
    // Replace with actual TTSOpenAI endpoint for voices
    const response = await axios.get('https://api.ttsopenai.com/v1/voices', {
      headers: { 'Authorization': `Bearer ${process.env.TTSOPENAI_API_KEY}` }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// --- Akool: Get Avatars ---
app.get('/api/avatars', async (req, res) => {
  try {
    // Replace with actual Akool endpoint for avatars
    const response = await axios.get('https://openapi.akool.com/v1/avatars', {
      headers: { 'Authorization': `Bearer ${process.env.AKOOL_API_KEY}` }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
});

// --- Generate Testimonial Video ---
app.post('/api/generate', async (req, res) => {
  const { testimonial, voiceId, avatarId } = req.body;
  try {
    // 1. Get TTS audio from TTSOpenAI
    const ttsResponse = await axios.post('https://api.ttsopenai.com/v1/tts', {
      text: testimonial,
      voice: voiceId
    }, {
      headers: { 'Authorization': `Bearer ${process.env.TTSOPENAI_API_KEY}` },
      responseType: 'arraybuffer'
    });
    const audioBuffer = Buffer.from(ttsResponse.data, 'binary');

    // 2. Send audio + avatar to Akool for video generation
    // (Assume Akool accepts multipart/form-data)
    const formData = new FormData();
    formData.append('audio', audioBuffer, 'audio.wav');
    formData.append('avatar_id', avatarId);
    formData.append('text', testimonial);

    const akoolResponse = await axios.post('https://openapi.akool.com/v1/talking-head/generate', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.AKOOL_API_KEY}`
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