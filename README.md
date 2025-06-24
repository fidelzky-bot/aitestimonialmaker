# AI Video Testimonial Maker — Backend

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys:
   - `AKOOL_API_KEY`
   - `TTSOPENAI_API_KEY`
   - `PORT` (default: 5000)

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/voices` — List available voices (TTSOpenAI)
- `GET /api/avatars` — List available avatars (Akool)
- `POST /api/generate` — Generate testimonial video
  - Body: `{ testimonial, voiceId, avatarId }`

---

**Note:** You must provide your own API keys for Akool and TTSOpenAI. 