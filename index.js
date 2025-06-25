import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Akool OAuth2 Token Management ---
let akoolToken = null;
let akoolTokenExpires = 0;

// MongoDB connection setup
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://aitestimonial:aitestimonialpass!@cluster0.rncdugm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const mongoClient = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
let jobsCollection;

async function connectMongo() {
  if (!jobsCollection) {
    await mongoClient.connect();
    const db = mongoClient.db('aitestimonial');
    jobsCollection = db.collection('pending_tts_jobs');
    console.log('Connected to MongoDB and ready for job storage.');
  }
}

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
  await connectMongo();
  console.log('Received /api/generate request:', req.body);
  const { testimonial, voiceId, avatarId } = req.body;
  try {
    // Log input
    console.log('Starting async video generation with:', { testimonial, voiceId, avatarId });

    // 1. Submit TTSOpenAI request with webhook
    const ttsRequestBody = {
      model: 'tts-1',
      voice_id: voiceId,
      speed: 1,
      input: testimonial,
      webhook_url: process.env.TTSOPENAI_WEBHOOK_URL || 'https://aitestimonialmaker.onrender.com/api/tts-webhook'
    };
    const ttsRequestHeaders = {
      'x-api-key': process.env.TTSOPENAI_API_KEY,
      'Content-Type': 'application/json'
    };
    console.log('TTSOpenAI async request body:', ttsRequestBody);
    try {
      await axios.post(
        'https://api.ttsopenai.com/uapi/v1/text-to-speech',
        ttsRequestBody,
        { headers: ttsRequestHeaders }
      );
      // Store the job context using testimonial, voiceId, avatarId
      await jobsCollection.insertOne({ testimonial, voiceId, avatarId, createdAt: new Date() });
      console.log('Stored pending TTS job in MongoDB:', { testimonial, voiceId, avatarId });
      res.json({ message: 'Video generation started. You will be notified when it is ready.' });
    } catch (ttsErr) {
      let errorMsg = ttsErr.response?.data;
      if (Buffer.isBuffer(errorMsg)) {
        errorMsg = errorMsg.toString('utf8');
      }
      console.error('TTSOpenAI API error:', errorMsg || ttsErr.message);
      return res.status(500).json({ error: 'Failed to start video generation', details: 'TTSOpenAI API error: ' + (errorMsg || ttsErr.message) });
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
    res.status(500).json({ error: 'Failed to start video generation', details: err.message });
  }
});

// --- Akool Webhook Endpoint ---
app.post('/api/akool-webhook', express.json(), (req, res) => {
  console.log('Received Akool webhook:', req.body);
  // You can process/store the video URL or status here
  res.status(200).send('OK');
});

// --- TTSOpenAI Webhook Endpoint ---
app.post('/api/tts-webhook', express.json(), async (req, res) => {
  await connectMongo();
  console.log('Received TTSOpenAI webhook:', JSON.stringify(req.body, null, 2));
  try {
    const { data } = req.body;
    const testimonial = data?.tts_input;
    const voiceId = data?.voice_id;
    console.log('Webhook testimonial:', testimonial);
    console.log('Webhook voiceId:', voiceId);
    // Find the most recent job context using testimonial and voiceId in MongoDB
    const job = testimonial && voiceId
      ? await jobsCollection.findOne({ testimonial, voiceId }, { sort: { createdAt: -1 } })
      : undefined;
    console.log('MongoDB job context:', job);
    if (!data || !data.media_url || !job) {
      console.error('Missing media_url or job context in TTSOpenAI webhook');
      return res.status(400).send('Missing media_url or job context');
    }
    const { avatarId } = job;
    const audioUrl = data.media_url;
    // Clean up the job context
    await jobsCollection.deleteOne({ _id: job._id });
    const token = await getAkoolToken();
    const akoolBody = {
      width: 3840,
      height: 2160,
      avatar_from: 2,
      elements: [
        {
          type: 'avatar',
          avatar_id: avatarId,
          scale_x: 1,
          scale_y: 1,
          width: 1080,
          height: 1080,
          offset_x: 1920,
          offset_y: 1080
        },
        {
          type: 'audio',
          url: audioUrl
        }
      ],
      webhookUrl: process.env.AKOOL_WEBHOOK_URL || 'https://aitestimonialmaker.onrender.com/api/akool-webhook'
    };
    console.log('Akool request body:', JSON.stringify(akoolBody, null, 2));
    try {
      const akoolResponse = await axios.post(
        'https://openapi.akool.com/api/open/v3/talkingavatar/create',
        akoolBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Akool video generation response (from webhook):', akoolResponse.data);
    } catch (akoolErr) {
      console.error('Akool API error (from webhook):', akoolErr.response?.data || akoolErr.message);
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error in /api/tts-webhook:', err.message);
    res.status(500).send('Internal server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 