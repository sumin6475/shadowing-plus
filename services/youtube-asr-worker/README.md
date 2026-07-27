# Private YouTube ASR worker

This is an owner-only worker for Shadowing Plus experiments. Do not expose it as a public product service.

## Required environment

```text
YOUTUBE_ASR_WORKER_SECRET=<same random secret as Vercel>
YOUTUBE_ASR_MAX_DURATION_SECONDS=3600
PORT=8080
```

Vercel also needs:

```text
YOUTUBE_ASR_WORKER_URL=https://private-worker.example.com
YOUTUBE_ASR_WORKER_SECRET=<same random secret>
YOUTUBE_ASR_MAX_DURATION_SECONDS=3600
```

## Dokploy deployment

1. Create a private application from `services/youtube-asr-worker` using its Dockerfile.
2. Set the three worker environment variables above. Do not put any R2 or Groq credential in the worker: it receives a short-lived, single-object R2 PUT URL from Vercel.
3. Put the worker behind HTTPS and restrict inbound traffic to Vercel where possible. The HMAC signature is required even on a private network.
4. Point `YOUTUBE_ASR_WORKER_URL` at the worker's HTTPS origin in Vercel, set the identical secret, then redeploy the web app.
5. Verify `GET /healthz` returns `{ "ok": true }`, then test one owner-approved short video.

## Operations and rollback

- Rotate the HMAC secret in worker and Vercel together; deploy worker first, then Vercel.
- Update the pinned `YT_DLP_VERSION` build argument deliberately and test one short video before promotion.
- The worker removes its local temporary files after every job. The app uses the uploaded audio only for ASR; delete it from R2 after the transcript checkpoint in the app pipeline.
- To disable this path immediately, remove `YOUTUBE_ASR_WORKER_URL` from Vercel and redeploy. Caption imports remain available.
- If a worker dies mid-job, the app's job reaper exposes the failure; retry creates a new acquisition job after confirming cost again.
