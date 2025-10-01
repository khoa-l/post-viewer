# How to Run

## Quick Start

### 1. Start Backend Server

Open Terminal:

```bash
cd /Users/khoaly/Desktop/30_research/31_thesis/3112_custom_feeds/q_client/reddit-oauth-backend
node server.js
```

Keep terminal open.

### 2. Start Frontend Server

Open new Terminal:

```bash
cd /Users/khoaly/Desktop/30_research/31_thesis/3112_custom_feeds/q_client
python3 -m http.server 8000
```

Keep terminal open.

### 3. View a Post

Open browser:

```
http://localhost:8000/custom-client.html?url=REDDIT_POST_URL
```

Example:
```
http://localhost:8000/custom-client.html?url=https://reddit.com/r/aww/comments/1g0i9qd/
```

## Stopping Servers

Press Ctrl+C in each terminal.

## Troubleshooting

**Port in use:**
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

**404 Error:** Post URL does not exist. Try a different post.

**No Token Error:** Token configured at line 271-272 in `custom-client.html`. Visit `http://localhost:8000/auth.html` to get a new one if needed.
