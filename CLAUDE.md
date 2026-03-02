# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vercel-hosted serverless web application that analyzes user-uploaded photos and finds the most similar character from the Chinese TV drama "Zhen Huan Zhuan" (Empresses in the Palace). Uses Doubao Seed LLM for AI-powered facial analysis.

## Common Commands

```bash
# Local development
npm run dev

# Deploy to Vercel
npx vercel

# Login to Vercel
npx vercel login
```

## Environment Variables

Required environment variable (see `.env.example`):
- `DOUBAO_API_KEY` - ByteDance Doubao API key for the AI model

## Architecture

### Frontend (`public/`)
- `index.html` - Main entry point with palace-themed UI
- `script.js` - Client-side logic: file upload handling, API communication, result rendering
- `style.css` - Chinese palace-style CSS with animations

### Backend (`api/`)
- `analyze.js` - Vercel serverless function that:
  1. Accepts POST requests with base64 image data
  2. Proxies requests to Doubao Seed API (ark.cn-beijing.volces.com)
  3. Parses AI response and ensures exactly 3 character matches
  4. Falls back to random characters if AI returns rejection/invalid results
  5. Returns JSON with character matches including similarity scores, reasons, and tags

### Data (`data/`)
- `characters.json` - Static character database with names, avatars, descriptions, classic quotes, and tags for 16 main characters

### Configuration
- `vercel.json` - Routes `/api/analyze` to the serverless function; serves `public/` as static files

## API Contract

**Endpoint**: `POST /api/analyze`

Request body:
```json
{
  "images": ["data:image/jpeg;base64,..."],
  "prompt": "分析这张照片中人物的特点..."
}
```

Response:
```json
{
  "success": true,
  "characters": [
    {
      "name": "甄嬛",
      "similarity": 92,
      "reason": "聪慧隐忍",
      "funny_comment": "人间清醒本醒",
      "tags": ["大女主", "聪明人"],
      "avatar": "/images/甄嬛.jpg"
    }
  ]
}
```

## Key Implementation Notes

- The API enforces exactly 3 character results to maintain UI consistency
- Includes fallback logic: if AI returns rejection phrases ("没有发现", "无法分析"), uses random character selection
- Character images are served from `/images/` directory (stored in repo)
- Images are converted to base64 on client side before sending to API
- Maximum 5 images per analysis, 10MB per image limit

## Development Guidelines for Claude

- Make minimal changes per task
- Do not refactor unrelated files
- Preserve API contract format
- Maintain exactly 3 character results
