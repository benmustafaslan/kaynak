# How to share Kaynak with a friend (they run it locally)

## Your steps (repo owner)

### 1. Push the project to GitHub

If you haven’t already:

```bash
cd ~/Desktop/Kaynak
git init
git add .
git commit -m "Initial commit"
```

Create a new repository on [GitHub](https://github.com/new) (e.g. `kaynak-newsroom`). Then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

(Use your real GitHub username and repo name.)

### 2. Give your friend access

- **Option A:** Make the repo **Public** — anyone with the link can clone.
- **Option B:** Add them as a **Collaborator**: repo → Settings → Collaborators → Add people (they need a GitHub account).

### 3. Decide about the database

Your friend needs a working `MONGODB_URI` in their `.env`.

- **Option A – They use their own MongoDB:**  
  Send them this doc and tell them to follow “If you don’t have MongoDB yet” in [SETUP.md](../SETUP.md) to create a free Atlas cluster and get their own connection string.

- **Option B – They use your MongoDB:**  
  1. In [MongoDB Atlas](https://cloud.mongodb.com) → your project → Database Access → Add New Database User.  
  2. Create a user (e.g. `friend_test`), set a password, give “Read and write to any database” (or restrict to `newsroom_production`).  
  3. Copy your connection string, replace the password with the new user’s password.  
  4. Send them **only** the `MONGODB_URI` and `MONGODB_DB_NAME` (and say “use these in `.env`”). **Do not** send your main account password or full `.env` — only what’s needed.

---

## Your friend’s steps

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

(Replace with the real repo URL you sent them.)

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Create `.env`

```bash
cp .env.example .env
```

Then open `.env` and set:

- **MONGODB_URI** — Either the URI you gave them, or their own Atlas connection string (see [SETUP.md](../SETUP.md) if they need to create MongoDB).
- **MONGODB_DB_NAME** — e.g. `newsroom_production` (or same as you use).
- **JWT_SECRET** — Any long random string (e.g. `my-super-secret-key-12345`). Can be the same as in `.env.example` for local testing.
- **CLIENT_URL** — Leave as `http://localhost:5173` for local run.

They do **not** need to change `PORT` or `NODE_ENV` for local testing.

### 4. Start the app

```bash
npm run dev
```

Wait until they see the server and client URLs.

### 5. Open in the browser

Go to: **http://localhost:5173**

They can register a new account and use the app. If they use **your** MongoDB, they’ll see the same database (same stories/users); if they use **their own** MongoDB, they’ll have an empty app and need to register.

---

## Quick checklist for you

- [ ] Code pushed to GitHub  
- [ ] Repo is public or friend is added as collaborator  
- [ ] Friend knows whether to use their own MongoDB or the URI you sent  
- [ ] You sent them the repo URL and this guide (or a link to it)
