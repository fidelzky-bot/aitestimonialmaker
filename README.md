# AI Video Testimonial Maker

A powerful web application that creates professional video testimonials using AI-powered avatars and text-to-speech technology.

## Features

- **AI-Powered Avatars**: Choose from a variety of realistic AI avatars
- **Text-to-Speech**: Multiple voice options for natural-sounding speech
- **Real-time Preview**: Preview voices before generating the full video
- **Professional UI**: Modern, responsive design with beautiful animations
- **Easy Sharing**: Download or share your generated videos
- **Mobile Friendly**: Works perfectly on all devices

## Tech Stack

### Backend
- **Node.js** with Express.js
- **TTSOpenAI API** for text-to-speech
- **Akool API** for AI avatar generation
- **CORS** enabled for frontend integration

### Frontend
- **HTML5** with semantic markup
- **CSS3** with modern design patterns
- **Vanilla JavaScript** for interactivity
- **Responsive design** for all screen sizes

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- API keys for TTSOpenAI and Akool

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   Create a `.env` file in the root directory with your API keys:
   ```env
   TTSOPENAI_API_KEY=your_ttsopenai_api_key_here
   AKOOL_CLIENT_ID=your_akool_client_id_here
   AKOOL_CLIENT_SECRET=your_akool_client_secret_here
   PORT=5000
   ```

3. **Start the backend server**:
   ```bash
   npm start
   ```

   The server will run on `http://localhost:5000`

### Frontend Setup

1. **Open the frontend**:
   Simply open `index.html` in your web browser, or serve it using a local server:

   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```

2. **Access the application**:
   Open your browser and go to `http://localhost:8000`

## Usage

### Creating a Video Testimonial

1. **Enter Testimonial Text**:
   - Type or paste your testimonial text in the text area
   - The character count will update automatically

2. **Select a Voice**:
   - Choose from the available TTS voices in the dropdown
   - Use the "Preview Voice" button to hear a sample

3. **Choose an Avatar**:
   - Browse through the available AI avatars
   - Click on an avatar to select it (it will be highlighted)

4. **Generate Video**:
   - Click the "Generate Video Testimonial" button
   - Wait for the AI to process your request
   - Your video will appear in the results section

### Video Actions

Once your video is generated, you can:

- **Play**: Use the video controls to play/pause/seek
- **Download**: Save the video to your device
- **Share**: Share the video URL or use native sharing
- **Create New**: Start over with a new testimonial

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/voices` - Get available TTS voices
- `GET /api/avatars` - Get available AI avatars
- `POST /api/generate` - Generate video testimonial

### Generate Video Request Format

```json
{
  "testimonial": "Your testimonial text here",
  "voiceId": "voice_id_from_voices_endpoint",
  "avatarId": "avatar_id_from_avatars_endpoint"
}
```

### Generate Video Response Format

```json
{
  "videoUrl": "https://example.com/generated-video.mp4"
}
```

## Configuration

### Backend Configuration

Update the `API_BASE_URL` in `script.js` if your backend runs on a different port:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### CORS Configuration

The backend is configured to allow requests from any origin. For production, you may want to restrict this to your specific domain.

## Troubleshooting

### Common Issues

1. **"Failed to load voices and avatars"**:
   - Check that your backend server is running
   - Verify your API keys are correct
   - Check the browser console for detailed error messages

2. **"Failed to generate video"**:
   - Ensure all required fields are filled
   - Check your API key limits and quotas
   - Verify the testimonial text is not too long

3. **CORS Errors**:
   - Make sure the backend CORS configuration allows your frontend domain
   - Check that the API_BASE_URL is correct

### Browser Compatibility

The frontend works on all modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Project Structure

```
AI Video Testimonial Maker/
├── index.js          # Backend server
├── package.json      # Backend dependencies
├── index.html        # Frontend HTML
├── styles.css        # Frontend styles
├── script.js         # Frontend JavaScript
└── README.md         # This file
```

### Adding New Features

1. **New Voice Providers**: Add new TTS API integrations in the backend
2. **New Avatar Providers**: Integrate additional AI avatar services
3. **UI Enhancements**: Modify the CSS and HTML for new design elements
4. **Functionality**: Extend the JavaScript for new features

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify your API keys and configurations
4. Ensure your backend server is running properly 