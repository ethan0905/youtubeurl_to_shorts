## 🚀 Quick Setup Guide

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `fluent-ffmpeg` - FFmpeg wrapper for video processing
- `@distube/ytdl-core` - YouTube video downloader
- Other dependencies

### 2. Install FFmpeg

**macOS**:
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows**:
1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to system PATH

Verify installation:
```bash
ffmpeg -version
```

### 3. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and add required keys:
```env
OPENAI_API_KEY="sk-your-key-here"
YOUTUBE_API_KEY="AIza-your-key-here"  # Optional but recommended
```

### 4. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## ✅ Verification

Test that everything works:

1. Paste a YouTube URL (try a short 2-3 min video first)
2. Wait for detection
3. Click "Continue to Editor"
4. AI will analyze and show segments
5. Click "Generate Shorts"
6. Wait for processing (download + extraction)
7. Download the generated video files

## 📝 Notes

- **First run**: Video download may take time depending on your connection
- **FFmpeg**: Required for video processing
- **Disk space**: Videos are stored in `public/uploads` (can be large)
- **Processing time**: A 10-minute video with 3 segments takes ~2-5 minutes to process

## 🔧 Troubleshooting

### "FFmpeg not found"
- Make sure FFmpeg is installed and in PATH
- Restart your terminal after installation

### "YouTube download failed"
- Add YOUTUBE_API_KEY to .env for better reliability
- Some videos may be restricted (age-gated, private, etc.)

### "OpenAI API error"
- Check your API key is valid
- Verify you have credits on your OpenAI account

### "Processing stuck"
- Check terminal for error logs
- Ensure `public/uploads` and `public/outputs` directories exist and are writable

## 🎯 First Video Recommendations

For testing, use videos that are:
- ✅ Public and not age-restricted
- ✅ 5-15 minutes long
- ✅ High quality (720p or better)
- ❌ Avoid very long videos (>1 hour) for first test

## 💡 Tips

- Shorter videos process faster for testing
- The app auto-creates `public/uploads` and `public/outputs` directories
- Downloaded videos are cached - re-processing the same video is faster
- Generated shorts are in vertical format (1080x1920) optimized for mobile

Enjoy creating shorts! 🎬
