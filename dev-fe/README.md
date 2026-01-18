# DocuFlow Frontend

Next.js frontend for authentication, dashboard, realtime document updates, and notifications.

## Requirements
- Node.js or Bun
- Backend API running (see `dev-be`)

## Setup
1. Copy env file and update the API URL if needed:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
bun install
```

## Run
- Development:

```bash
bun dev
```

- Production build:

```bash
bun run build
bun run start
```

## Environment
- `NEXT_PUBLIC_API_URL` (default: `http://localhost:4050`)

## Routes
- `/` Landing page
- `/login` Authentication
- `/register` Create account
- `/dashboard` Protected dashboard
