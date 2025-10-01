# Reddit Post Viewer

View Reddit posts with comments, images, videos, galleries, and links.

## Setup

1. Start backend server:
   ```bash
   cd reddit-oauth-backend
   node server.js
   ```

2. Start frontend server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open in browser:
   ```
   http://localhost:8000/custom-client.html?url=REDDIT_POST_URL
   ```

## Configuration

Token is stored in `.env` file:

```bash
# Edit .env file
REDDIT_ACCESS_TOKEN=your_token_here
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
```

To get a new token:
1. Visit `http://localhost:8000/auth.html`
2. Authenticate with Reddit
3. Copy token to `.env` file

## Usage

Replace `REDDIT_POST_URL` with any Reddit post:

```
http://localhost:8000/custom-client.html?url=https://reddit.com/r/aww/comments/abc123/title
```

## Features

- Post content (text, images, videos, galleries, links)
- Nested comments with timestamps
- Gallery carousel navigation
- No vote counts displayed
