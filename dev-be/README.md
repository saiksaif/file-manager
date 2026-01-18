# dev-be

Backend service for authentication, document management, categories, caching, and realtime updates.

## Requirements
- Bun
- PostgreSQL
- Redis (optional but recommended for caching and sessions)
- AWS S3 compatible storage

## Setup
1. Copy environment file and fill values:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
bun install
```

3. Generate Prisma client and run migrations:

```bash
bun run db:gen
bun run db:dev
```

## Run
- Development:

```bash
bun run dev
```

- Production:

```bash
bun run start
```

## Environment
Required:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `S3_REGION`
- `S3_BUCKET_NAME`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Optional:
- `REDIS_URL`
- `CORS_ORIGIN`
- `COOKIE_DOMAIN`
- `S3_ENDPOINT_URL`

## API Overview
- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`

- Documents
  - `POST /api/documents/upload`
  - `GET /api/documents`
  - `GET /api/documents/:id`
  - `PUT /api/documents/:id`
  - `DELETE /api/documents/:id`

- Categories
  - `GET /api/categories`
  - `POST /api/categories` (admin only)

- Notifications
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`

## Realtime (Socket.io)
- Namespace: `/users`
- Authentication: uses the `access_token` cookie or Bearer token
- Events:
  - `document:uploaded`
  - `document:updated`
  - `document:deleted`
  - `notification:new`
  - `user:online`
  - `user:offline`
  - `connection:status`

## Notes
- Redis is used for caching document lists, document details, categories, and user sessions. If Redis is unavailable, the API falls back to direct database reads.
- S3 configuration is required for document uploads.
