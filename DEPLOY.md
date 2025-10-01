# Deploy to Render

## Prerequisites

1. GitHub account
2. Render account (free tier available at render.com)
3. Reddit app credentials

## Step 1: Push to GitHub

```bash
cd /Users/khoaly/Desktop/30_research/31_thesis/3112_custom_feeds/q_client

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create GitHub repo and push
# Option 1: Via GitHub CLI
gh repo create reddit-post-viewer --public --source=. --remote=origin --push

# Option 2: Via GitHub website
# 1. Create repo on github.com
# 2. Add remote:
git remote add origin https://github.com/YOUR_USERNAME/reddit-post-viewer.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: reddit-post-viewer
   - **Environment**: Node
   - **Build Command**: `cd reddit-oauth-backend && npm install`
   - **Start Command**: `cd reddit-oauth-backend && node server.js`
   - **Instance Type**: Free

5. Add Environment Variables:
   - `REDDIT_CLIENT_ID`: Your Reddit app client ID
   - `REDDIT_CLIENT_SECRET`: Your Reddit app secret
   - `REDDIT_REDIRECT_URI`: `https://YOUR_APP_NAME.onrender.com/auth.html`

6. Click "Create Web Service"

## Step 3: Update Frontend Config

After deployment, update `custom-client.html` line 273:

```javascript
const CONFIG = {
  token: "YOUR_TOKEN_HERE",
  backendUrl: "https://YOUR_APP_NAME.onrender.com"
};
```

## Step 4: Update Reddit App

Go to https://www.reddit.com/prefs/apps and update your app's redirect URI to:
```
https://YOUR_APP_NAME.onrender.com/auth.html
```

## Step 5: Get New Token

1. Visit `https://YOUR_APP_NAME.onrender.com/auth.html`
2. Authenticate with Reddit
3. Copy the token
4. Update `custom-client.html` line 271-272 with the new token
5. Commit and push changes

## Usage

```
https://YOUR_APP_NAME.onrender.com/custom-client.html?url=REDDIT_POST_URL
```

## Notes

- Free tier sleeps after inactivity (may take 30s to wake)
- Backend serves both API and static files
- Token is hardcoded for research use only
