# Shadowing Plus

A web app that helps users practice English shadowing with AI-generated subtitles and sentence-by-sentence audio playback.

## What It Does

- Extracts audio from video files
- Generates subtitles using Whisper and GPT-4o-mini
- Provides Korean translations and word-by-word meanings by default
- Supports sentence-by-sentence playback, bookmarks, and repeat mode

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Database**: Supabase (PostgreSQL + Storage)
- **Processing**: Python 3, FFmpeg, Vibe (whisper.cpp), GPT-4o-mini
- **Deployment**: Vercel (web), Local (processing scripts)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3
- FFmpeg
- Vibe app (for local transcription)
- Supabase account

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/your-username/shadowing-plus.git
   ```

2. Install web dependencies

   ```bash
   cd web && npm install
   ```

3. Install Python dependencies

   ```bash
   pip install -r scripts/requirements.txt
   ```

4. Set up environment variables

   ```bash
   cp web/.env.local.example web/.env.local    # Edit with your Supabase keys
   cp scripts/.env.example scripts/.env        # Edit with your API keys
   ```

5. Run the development server

   ```bash
   cd web && npm run dev
   ```

## Usage

### Process a Video

Start the Vibe app, click "Start Server", then run:

```bash
./sp media/video.mp4 --title "Video Title" --vibe-port <PORT>
```

Preview transcription without GPT costs:

```bash
./sp media/video.mp4 --title "Video Title" --vibe-port <PORT> --dry-run
```

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `A` | Previous sentence |
| `S` | Repeat current sentence |
| `D` | Next sentence |
| `Space` | Play / Pause |
| `←` `→` | Skip 3 seconds |

## Environment Variables

### Web (`web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (local dev only) |

### Scripts (`scripts/.env`)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `VIBE_API_PORT` | Vibe server port (default: 65224) |

## License

MIT
