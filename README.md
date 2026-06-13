# YouTube Shorts Generator 🎬

AI-powered tool to automatically detect highlights from long-form sports videos and create YouTube Shorts.

## Features

- 🔍 **YouTube Search**: Find World Cup matches and sports videos
- 🤖 **AI Highlight Detection**: Uses OpenAI Vision to identify exciting moments
- ✂️ **Automated Video Processing**: Extracts highlights and creates Shorts (9:16 format)
- 📤 **YouTube Upload**: Automatically upload created Shorts to your channel
- 🎯 **Smart Tagging**: Auto-generates titles, descriptions, and tags for maximum reach

## Requirements

- Node.js 18+ (for TypeScript/tsx support)
- FFmpeg installed on your system
- YouTube API key
- OpenAI API key

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# YouTube API
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_CHANNEL_ID=your_channel_id

# OpenAI API
OPENAI_API_KEY=your_openai_key_here

# Optional: For direct YouTube uploads
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
```

### 3. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
```bash
choco install ffmpeg
```

## Usage

### Search and Process World Cup Videos

```bash
npm start search 5
```

Finds and processes 5 World Cup videos, detecting highlights and creating Shorts.

### Process a Specific Video

```bash
npm start process https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Development Mode

```bash
npm run dev
```

Runs with auto-reload on file changes.

## How It Works

1. **Search**: Finds World Cup videos via YouTube API
2. **Download**: Downloads the full video to local storage
3. **Analyze**: AI scans the video to identify exciting moments
4. **Extract**: Cuts highlights into 15-60 second clips
5. **Format**: Converts to YouTube Shorts format (9:16 aspect ratio)
6. **Upload**: Publishes to your YouTube channel with optimized metadata

## AI Detection

The system uses OpenAI's Vision model to analyze video frames and identify:
- Goals and near-misses
- Impressive saves
- Fouls and red cards
- Player celebrations
- Dramatic moments
- Intense action sequences

Sensitivity can be adjusted via `HIGHLIGHT_SENSITIVITY` in `.env` (0.0-1.0).

## Directory Structure

```
├── src/
│   ├── services/          # Core services
│   │   ├── youtube.ts     # YouTube API integration
│   │   ├── downloader.ts  # Video download
│   │   ├── ai-analyzer.ts # Highlight detection
│   │   ├── video-processor.ts # Video editing
│   │   └── orchestrator.ts # Main orchestration
│   ├── config.ts          # Configuration
│   ├── logger.ts          # Logging
│   ├── types.ts           # TypeScript types
│   └── index.ts           # Entry point
├── output/                # Generated Shorts
├── temp/                  # Temporary files
└── .env                   # Environment variables
```

## Performance Tips

- Adjust `HIGHLIGHT_SENSITIVITY` (lower = more highlights detected)
- Set `MAX_CONCURRENT_JOBS` for parallel processing
- Use `MIN_HIGHLIGHT_DURATION` and `MAX_HIGHLIGHT_DURATION` to control clip length
- Clear temp files regularly: `rm -rf temp/*`

## Troubleshooting

**FFmpeg not found:**
```bash
which ffmpeg  # Verify installation
ffmpeg -version  # Check version
```

**API Key errors:**
- Verify API keys in `.env`
- Check API quotas and billing

**No highlights detected:**
- Lower `HIGHLIGHT_SENSITIVITY` value
- Ensure video has action sequences
- Check OpenAI API usage

## License

MIT

## Tips for Growth

✅ **Post Consistently**: Daily uploads get better reach
✅ **Use Trending Sounds**: Football fan communities love familiar tracks
✅ **Engage**: Reply to comments, pin top ones
✅ **Cross-Promote**: Share clips on TikTok, Instagram Reels
✅ **Quality Highlights**: The algorithm favors watch time
✅ **Optimize Metadata**: Good titles and descriptions improve discoverability

---

**Next Steps:**
1. Set up your YouTube channel
2. Generate API credentials
3. Add your API keys to `.env`
4. Run `npm start search 1` to test
5. Review generated Shorts before upload
