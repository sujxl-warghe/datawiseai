# 🚀 DataWiseAI — Deployment Guide

## Prerequisites
- GitHub account (free)
- MongoDB Atlas account (free)
- Render.com account (free)
- Vercel account (free)
- Google Cloud Console account (free)

---

## Step 1: MongoDB Atlas Setup (5 min)

1. Go to https://cloud.mongodb.com
2. Create free account → **Create a FREE cluster (M0)**
3. **Database Access** → Add user → username + password (save these!)
4. **Network Access** → Add IP → **0.0.0.0/0** (allow all)
5. **Connect** → **Drivers** → Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 2: Push to GitHub (3 min)

```bash
cd datawise
git init
git add .
git commit -m "Initial DataWiseAI commit"
```

Create new repo on github.com → then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/datawiseai.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy Backend on Render.com (10 min)

1. Go to https://render.com → Sign up free
2. **New** → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Name**: `datawiseai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables** → Add:
   ```
   MONGODB_URL     = mongodb+srv://...  (from Step 1)
   DB_NAME         = datawise
   JWT_SECRET      = (any random 64 char string)
   GROQ_MODEL      = llama-3.3-70b-versatile
   ENV             = production
   FRONTEND_URL    = (fill after Step 4)
   BACKEND_URL     = https://datawiseai-backend.onrender.com
   GOOGLE_CLIENT_ID     = (from Google Console)
   GOOGLE_CLIENT_SECRET = (from Google Console)
   ```
6. Click **Deploy** → Wait 3-5 min
7. Copy your backend URL: `https://datawiseai-backend.onrender.com`

---

## Step 4: Deploy Frontend on Vercel (5 min)

1. Go to https://vercel.com → Sign up free
2. **New Project** → Import your GitHub repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** → Add:
   ```
   VITE_API_URL = https://datawiseai-backend.onrender.com
   ```
5. Click **Deploy** → Wait 2 min
6. Copy your frontend URL: `https://datawiseai.vercel.app`

---

## Step 5: Update URLs (2 min)

**On Render.com** → Update environment variable:
```
FRONTEND_URL = https://datawiseai.vercel.app
```

**On Vercel** → No change needed

---

## Step 6: Google OAuth Production Setup (5 min)

1. Go to https://console.cloud.google.com
2. Your project → **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://datawiseai-backend.onrender.com/api/auth/google/callback
   ```
5. Save

---

## Step 7: Test Your Deployment ✅

Visit your Vercel URL → Login → Upload CSV → Enjoy!

---

## 🔄 Future Updates

```bash
git add .
git commit -m "Update"
git push
```
Both Render and Vercel auto-deploy on every push!

---

## ⚠️ Important Notes

- **Render free tier** sleeps after 15 min inactivity — first request takes ~30 sec to wake up
- **MongoDB Atlas** free tier has 512MB limit
- **Uploaded files** on Render are temporary — lost on redeploy (use Cloudinary for permanent storage)
- Keep your `.env` file secret — never push to GitHub!
