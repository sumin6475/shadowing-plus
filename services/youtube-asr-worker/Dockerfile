FROM node:22-bookworm-slim

ARG YT_DLP_VERSION=2025.08.27

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3-pip ca-certificates \
  && pip3 install --no-cache-dir --break-system-packages "yt-dlp==${YT_DLP_VERSION}" \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/server.js"]
