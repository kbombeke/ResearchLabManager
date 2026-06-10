# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vue app into static files ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci

# Supabase config is baked into the bundle at build time, so it must be
# present here (not at runtime). Pass via --build-arg or docker-compose.
# These are NOT secrets: the anon key is public, guarded by Supabase RLS.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_BIBLIO_BASE
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_BIBLIO_BASE=$VITE_BIBLIO_BASE

COPY . .
RUN npm run build

# ---- Serve stage: nginx serving the static files + Biblio proxy ----
FROM nginx:alpine
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
