# Kaynak – Newsroom Project Management Tool

Newsroom project management for journalists: stories from ideation to publication, with fact-checking, collaboration, and quality gates.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Auth**: JWT in httpOnly cookies, bcrypt

## Setup

1. **Clone and install**

   ```bash
   npm run install:all
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `MONGODB_URI` – MongoDB Atlas connection string (replace `<db_password>`)
   - `MONGODB_DB_NAME` – e.g. `newsroom_production`
   - `JWT_SECRET` – long random string for production
   - `CLIENT_URL` – frontend URL (default `http://localhost:5173`)

3. **Run**

   ```bash
   npm run dev
   ```

   - API: http://localhost:3000  
   - Client: http://localhost:5173  

   Or run separately:

   ```bash
   npm run dev:server   # backend only
   npm run dev:client   # frontend only
   ```

## Project Structure

```
/client          – React app (Vite, TypeScript, Tailwind)
/server          – Express API, MongoDB, auth
  /src
    /config      – database, env
    /controllers – auth, etc.
    /models      – User, etc.
    /middleware  – auth, rate limit, sanitize
    /routes      – auth, api
/docs            – design spec (see newsroom_tool_specification.md)
```

## Security

- Passwords hashed with bcrypt
- JWT in httpOnly cookies; no token in localStorage
- CORS for frontend origin only
- Rate limiting on auth and API
- Input sanitization

## Reference

Full design: `/docs/newsroom_tool_specification.md`
