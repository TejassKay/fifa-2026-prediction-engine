# FIFA 2026 Prediction Engine Deployment Guide

Deploying this application requires hosting the **FastAPI Backend** and the **Next.js Frontend** separately. Since they communicate via APIs, they can be hosted on platforms optimized for their respective languages.

> [!WARNING]
> **CRITICAL FIRST STEP**: Your Next.js frontend currently has `http://localhost:8000` hardcoded in 27 different components! Before deploying, you **must** replace these hardcoded URLs with an environment variable (e.g., `process.env.NEXT_PUBLIC_API_URL`). If you deploy without doing this, your live website will try to fetch data from the visitor's local machine and fail. Let me know if you want me to automatically refactor this for you!

---

## 1. Deploying the Backend (Render or Railway)

We generated a `requirements.txt` file for you, which makes deploying the Python FastAPI backend incredibly easy on platforms like **Render** or **Railway**.

### Option A: Deploy on Render (Recommended & Free)
1. Push your latest code (with the `requirements.txt`) to GitHub.
2. Go to [Render.com](https://render.com) and sign in.
3. Click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend:app --host 0.0.0.0 --port $PORT`
6. Click **Create Web Service**. Render will automatically build your dependencies and start the FastAPI server.
7. *Copy the backend URL Render gives you (e.g., `https://fifa-backend.onrender.com`).*

---

## 2. Deploying the Frontend (Vercel)

Vercel is the creator of Next.js and provides the absolute best hosting experience for it.

### Prerequisites
In your frontend code, make sure you update your API calls to use an environment variable. For example:
`const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";`

### Steps
1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and import your GitHub repository.
3. In the **Framework Preset**, ensure it says `Next.js`.
4. In the **Root Directory**, click edit and select `frontend/`.
5. Under **Environment Variables**, add the URL of your live backend:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://fifa-backend.onrender.com` *(or whatever URL Render gave you)*
6. Click **Deploy**. Vercel will build the frontend and give you a live URL.

---

## 3. Alternative: Deploying Both on a Single VPS (Advanced)

If you'd prefer to host both the frontend and backend on a single server (like a DigitalOcean Droplet, AWS EC2, or Hetzner VPS) to save money or avoid platform limits:

1. Create a `docker-compose.yml` file to containerize both the Next.js app and the FastAPI app.
2. Set up an NGINX reverse proxy on the server to route `/api` traffic to the backend port, and all other traffic to the frontend port.
3. Run `docker-compose up --build -d`.

Let me know if you'd like me to write the `docker-compose.yml` and `Dockerfile` scripts for you!
