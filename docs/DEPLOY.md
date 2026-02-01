# Deploy Kaynak Online (Beginner Guide)

This guide gets your Kaynak app running on the internet using **MongoDB Atlas** (database) and **Render** (hosting). You only need the accounts you already created. No prior experience assumed.

---

## What we’re doing in short

1. **MongoDB Atlas** – We get a “connection string” so the app can talk to your database.
2. **GitHub** – We put your project code online so Render can use it.
3. **Render** – We create a “Web Service” that builds and runs your app, and give it the MongoDB string and a few other settings.

When it’s done, you’ll have a link like `https://kaynak-xxxx.onrender.com` that you can open in a browser to use the app.

---

# Part 1: Get your MongoDB connection string

You need one link (connection string) from MongoDB Atlas. Do this once.

1. **Log in** to [MongoDB Atlas](https://cloud.mongodb.com).
2. **Create a cluster** (if you don’t have one):
   - Click **“Build a Database”**.
   - Choose **M0 (Free)** and the region closest to you.
   - Click **Create**.
3. **Create a database user** (so the app can connect):
   - When asked “How would you like to authenticate?”, choose **Username and Password**.
   - Choose a **Username** (e.g. `kaynakuser`) and a **Password** (e.g. a long random one; **save it somewhere**).
   - Click **Create User**.
4. **Allow access from anywhere** (so Render can reach your database):
   - In the **left sidebar** of the Atlas dashboard, click **"Network Access"** (under the Security section).
   - Click **"Add IP Address"** (or **"+ ADD IP ADDRESS"**).
   - In the dialog, click **"Allow Access from Anywhere"**. That will fill in **`0.0.0.0/0`**.
   - Click **Confirm**. Your database will now accept connections from Render.
5. **Get the connection string**:
   - Click **“Connect”** on your cluster.
   - Choose **“Connect your application”**.
   - Copy the connection string. It looks like:
     ```text
     mongodb+srv://kaynakuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - **Replace `<password>`** with the real password you set for the database user (no angle brackets). Save this full string somewhere (e.g. a Notes app); you’ll paste it into Render later.

You’re done with MongoDB for now.

---

# Part 2: Put your project on GitHub

Render needs your code to be on GitHub so it can build and run it.

1. **Create a GitHub account** at [github.com](https://github.com) if you don’t have one.
2. **Create a new repository**:
   - On GitHub, click the **“+”** at the top right → **“New repository”**.
   - **Repository name:** e.g. `kaynak` (or any name you like).
   - Leave it **Public**. Don’t add a README, .gitignore, or license (your project already has them).
   - Click **“Create repository”**.
3. **Push your Kaynak project** from your computer.

   Open a terminal in Cursor (Terminal → New Terminal) and make sure you’re in the project folder (e.g. `Desktop/Kaynak`). Then run these commands **one by one** (replace `YOUR_GITHUB_USERNAME` and `kaynak` with your GitHub username and repo name):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/kaynak.git
   git push -u origin main
   ```

   If it asks for your GitHub username and password, use your GitHub username and a **Personal Access Token** as the password (GitHub no longer accepts account passwords here). To create a token: GitHub → your profile picture → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token**; give it “repo” scope and copy the token.

   When `git push` finishes, you should see your code on the GitHub website in that repository.

---

# Part 3: Create the app on Render

1. **Log in** to [Render](https://render.com) (use “Log in with GitHub” so Render can see your repos).
2. **Create a Web Service**:
   - On the dashboard, click **“New +”** → **“Web Service”**.
   - **Connect a repository:** If you see “Configure account” or “Grant access”, allow Render to access GitHub, then choose the repo you just pushed (e.g. `kaynak`).
   - Select that repo and click **“Connect”**.
3. **Configure the service**:
   - **Name:** e.g. `kaynak` (this will be part of your URL: `https://kaynak.onrender.com`).
   - **Region:** Pick one close to you.
   - **Branch:** `main` (or whatever branch you pushed).
   - **Runtime:** **Node**.
   - **Build Command:** copy-paste exactly:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command:** copy-paste exactly:
     ```bash
     npm run start
     ```
   - **Instance type:** leave **Free** (or choose a paid plan if you prefer).
4. **Add environment variables** (this is required):

   Scroll to **“Environment Variables”** and click **“Add Environment Variable”**. Add each of these **one by one** (key = name, value = what’s in the table).

   | Key              | Value |
   |------------------|--------|
   | `NODE_ENV`       | `production` |
   | `MONGODB_URI`    | The full connection string from Part 1 (with `<password>` replaced by your real DB password) |
   | `MONGODB_DB_NAME`| `newsroom_production` |
   | `JWT_SECRET`     | Any long random string (e.g. 30+ random letters/numbers). You can use a generator: [randomkeygen.com](https://randomkeygen.com) → “CodeIgniter Encryption Keys” and copy one. |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL`     | Leave this for the step below. |

   Do **not** add `PORT` — Render sets it automatically.

5. **Create the Web Service**  
   Click **“Create Web Service”**. Render will start building and then run your app. This can take a few minutes.
6. **Set CLIENT_URL** (after the first deploy):
   - At the top of the page you’ll see something like **“Your service is live at https://kaynak-xxxx.onrender.com”**. Copy that full URL (with `https://`).
   - In the left sidebar click **“Environment”**.
   - Click **“Add Environment Variable”**.
   - **Key:** `CLIENT_URL`  
     **Value:** the URL you copied (e.g. `https://kaynak-xxxx.onrender.com`).
   - Save. Render will redeploy automatically; wait until it’s finished.

---

# Part 4: Use your app

1. Open the service URL (e.g. `https://kaynak-xxxx.onrender.com`) in your browser.
2. You should see the Kaynak login page.
3. Click **Register**, create an account, then log in.

Your app is now running on the internet.

---

# If something goes wrong

- **Build failed on Render**  
  On the Render service page, open the **“Logs”** tab and read the error. Often it’s a typo in the build command or a missing env var (e.g. `MONGODB_URI` or `JWT_SECRET`).

- **“Application failed to respond” or blank page**  
  Check that **CLIENT_URL** is set to your exact Render URL (with `https://`, no slash at the end). Then in **Environment** add/update it and let Render redeploy.

- **Invite link or "Add Member" link contains localhost**  
  The server builds invite links using **CLIENT_URL**. In Render, open your backend service → **Environment** → set **CLIENT_URL** to the URL where users open the app in the browser (e.g. `https://kaynak-xxxx.onrender.com`), with `https://` and no trailing slash. Save; Render will redeploy and invite links will use the correct URL.

- **“Could not connect to database”**  
  In MongoDB Atlas, **Network Access** must include `0.0.0.0/0`. In **MONGODB_URI**, make sure you replaced `<password>` with your real database user password (and that the password has no special characters that need encoding, or try a simpler password for the DB user).

- **Changes you make on your computer don’t appear online**  
  Push to GitHub again: in the project folder run `git add .`, then `git commit -m "Update"`, then `git push`. Render will redeploy automatically if “Auto-Deploy” is on (default).

---

**Summary:** Get MongoDB connection string (and allow `0.0.0.0/0`) → Push project to GitHub → Create Render Web Service → Add env vars (including `MONGODB_URI` and `JWT_SECRET`) → Set `CLIENT_URL` to your Render URL → Open the URL and register.
