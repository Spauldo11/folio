# Folio — Digital Photo Books from Google Drive

Turn any Google Drive folder into a beautiful, shareable photo gallery. Sign in with your Google account, paste a folder link, and Folio renders your photos in a masonry grid with a full-screen lightbox viewer.

## Features

- **Google OAuth sign-in** — access your private Drive folders securely
- **Masonry grid gallery** — Pinterest-style layout with staggered entrance animations
- **Full-screen lightbox** — keyboard, mouse, and touch/swipe navigation
- **Shareable links** — send a URL to anyone with access to the Drive folder
- **Adjustable columns** — live column slider from 2–6 columns
- **Sort toggle** — newest-first or oldest-first by creation date
- **Responsive** — works on desktop, tablet, and mobile

---

## Setup: Google Cloud Credentials

Before Folio can access Google Drive, you need to create a Google Cloud project and OAuth credentials. This takes about 5 minutes.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it something like `Folio Photo Display`
4. Click **Create**

### Step 2: Enable the Google Drive API

1. In your new project, go to **APIs & Services** → **Library**
2. Search for **Google Drive API**
3. Click **Enable**

### Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (or Internal if using a Workspace account)
3. Fill in:
   - **App name**: `Folio`
   - **User support email**: your email
   - **Developer contact**: your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or remove scopes**, search for `drive.readonly`, check it, and save
6. On the **Test users** page, add your Google email
7. Click **Save and Continue**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Folio Web Client`
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local dev)
   - Your production domain if deploying
6. Click **Create**
7. Copy the **Client ID** (looks like `123456789-abcdef.apps.googleusercontent.com`)

### Step 5: Add Your Client ID to Folio

Open `js/config.js` and set your Client ID:
```javascript
CLIENT_ID: '123456789-abcdef.apps.googleusercontent.com',
```

### Step 6 (Optional): Enable Public Viewing Without Sign-in

To let anyone view your shared photo books **without signing in to Google**:
1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), click **+ Create Credentials** → **API key**.
2. Copy your new API key.
3. Open `js/config.js` and paste it into `API_KEY`:
   ```javascript
   API_KEY: 'AIzaSy...',
   ```
4. In Google Drive, ensure your photo folder is shared as **"Anyone with the link can view"**.

Now, anyone who opens a shared `book.html?folder=...` link can view all photos instantly without any sign-in prompt!

---

## Running Locally

```bash
npm run dev
```

This starts a local server at [http://localhost:3000](http://localhost:3000).

> **Important**: Google OAuth requires the page to be served over `http://` or `https://` — opening the HTML file directly (`file://`) will not work.

---

## Sharing Galleries

1. Open a folder in Folio
2. Click the **Share** button in the top bar
3. Copy the generated link

The link encodes the Drive folder ID. Recipients must:
1. Have access to the folder in Google Drive (shared with them or set to "Anyone with the link")
2. Sign in to Folio with their own Google account

To share Drive folder access, use Google Drive's built-in sharing settings.

---

## Project Structure

```
photo-display/
├── index.html              # Main page
├── .gitignore              # Git ignore (excludes local config & node_modules)
├── css/
│   └── index.css           # Design system & all styles
├── js/
│   ├── config.example.js   # Configuration template
│   ├── config.js           # Local config (gitignored)
│   ├── auth.js             # Google OAuth module
│   ├── drive.js            # Drive API interactions
│   ├── gallery.js          # Masonry grid & lightbox
│   └── app.js              # Main app controller
├── package.json            # Dev server script
└── README.md               # Documentation
```
