# Kaynak – Quick setup after `npm run install:all`

## Step 2: Set up your `.env` file

You already have a `.env` file (same as `.env.example`). You only need to change **one** thing for the app to start.

### If you have MongoDB Atlas

1. Open the file **`.env`** in Cursor (in the root of the Kaynak folder).
2. Find this line:
   ```
   MONGODB_URI=mongodb+srv://benmustafaslan_db_user:<db_password>@newsroomcluster...
   ```
3. Replace **`<db_password>`** with your **real MongoDB Atlas password** (the one you set for user `benmustafaslan_db_user`).
4. Save the file (Cmd+S).

### If you don’t have MongoDB yet

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Sign up (free) and create a **free cluster**.
3. Create a database user (username + password). Remember the password.
4. In **Network Access**, add **0.0.0.0/0** (or “Allow from anywhere”) so your app can connect.
5. Click **Connect** → **Connect your application** → copy the connection string. It looks like:
   `mongodb+srv://USERNAME:PASSWORD@clusterxxx.mongodb.net/`
6. Open **`.env`** in Kaynak and set:
   ```
   MONGODB_URI=paste-your-full-connection-string-here
   MONGODB_DB_NAME=kaynak
   ```
   (Use your real password in the string; no `<db_password>`.)
7. Save the file.

---

## Step 3: Start the app

In the terminal (same folder: `~/Desktop/Kaynak`):

```bash
npm run dev
```

Wait until you see something like “Server running on port 3000” and “Local: http://localhost:5173”.

## Step 4: Open the app

In your browser go to: **http://localhost:5173**

You should see the Kaynak login page. Use **Register** to create an account, then sign in.

---

**Summary:** Edit `.env` → set `MONGODB_URI` (and replace `<db_password>` if you use the existing URI) → run `npm run dev` → open http://localhost:5173.
