# Exposing Local ONLYOFFICE Server via Cloudflare Quick Tunnel

This document explains how the local ONLYOFFICE Document Server running in Docker is made available over the internet so that users on other networks can access the editor on the live Firebase application.

## 1. Why a Tunnel is Needed
The Firebase-hosted frontend requires a public HTTPS URL to reach the ONLYOFFICE Document Server. Because the ONLYOFFICE server is running locally on your laptop (`localhost:8080`), other users visiting the website cannot access it. A Cloudflare Quick Tunnel creates a secure outbound connection from your machine to Cloudflare's edge, assigning a temporary public HTTPS URL that securely forwards traffic to your local Docker container without requiring port forwarding or a paid VPS.

## 2. Prerequisites
- Docker Desktop running the `onlyoffice/documentserver` container on port 8080.
- `cloudflared` installed on your machine. (We have downloaded `cloudflared.exe` into the `CoreResearch` root folder).

## 3. Starting the ONLYOFFICE Server
To ensure your local ONLYOFFICE server is running, execute:
```powershell
cd poc/onlyoffice
docker-compose up -d
```

## 4. Starting the Cloudflare Quick Tunnel
Open a PowerShell terminal in the `CoreResearch` root folder and run:
```powershell
.\cloudflared.exe tunnel --url http://localhost:8080
```
Keep this terminal open! If you close it, the tunnel shuts down and the editor will break for external users.

## 5. Obtaining the Public URL
In the output of the `cloudflared` command, look for a line resembling this:
```
INF |  https://<random-words>.trycloudflare.com  |
```
Copy that entire `https://...trycloudflare.com` URL.

## 6. Updating the Frontend Configuration
Every time you restart the Quick Tunnel, the URL will change. You must update the production environment variables before deploying.
Open `client/.env.production` and update the URL:
```env
VITE_ONLYOFFICE_SERVER_URL=https://<your-new-random-words>.trycloudflare.com/
```
*(Ensure the URL ends with a trailing slash `/` as required by the setup).*

## 7. Rebuilding and Deploying
After updating `.env.production`, rebuild the frontend and deploy to Firebase:
```powershell
cd client
npm run build
firebase deploy
```

## 8. Backend Configuration (Render)
For ONLYOFFICE to successfully save documents back to MongoDB, your backend server on Render must have the correct callback URL configuration. Ensure these variables are set in the Render Dashboard:
- `BACKEND_PUBLIC_URL=https://coreresearch-api-lspu-40301844.onrender.com`
- `ONLYOFFICE_JWT_SECRET=super_secret_key_123`

## 9. Important Limitations
> [!WARNING]
> **Temporary URL:** The `.trycloudflare.com` URL is temporary. If your PC reboots, your internet disconnects, or you close the tunnel terminal, the URL will expire. You will need to start a new tunnel, get the new URL, update `.env.production`, and redeploy to Firebase.
> 
> **Machine Uptime:** The local PC hosting Docker and the tunnel must remain powered on, awake, and connected to the internet for the editor to work for anyone else.

## 10. Shutting Down
To stop the tunnel, simply press `Ctrl+C` in the PowerShell window where `cloudflared.exe` is running. You can stop the ONLYOFFICE Docker container by running `docker-compose down` in `poc/onlyoffice`.
