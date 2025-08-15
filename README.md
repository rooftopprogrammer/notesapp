# RNotes - Progressive Web App

A modern note-taking application built with Next.js 15, Firebase, and Progressive Web App capabilities.

## 🚀 Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Firebase** integration ready
- **Progressive Web App** (PWA) support
- **Authentication** context setup
- **Responsive design**

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Firebase project setup
- Basic knowledge of React and Next.js

## 🛠️ Setup Instructions

### 1. Install Dependencies

Dependencies are already installed during project creation.

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Get your Firebase configuration from Project Settings
4. Update `src/lib/firebase.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Add PWA Icons

Add the following icon files to the `public` folder:
- `icon-192x192.png`
- `icon-256x256.png`
- `icon-384x384.png`
- `icon-512x512.png`

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🏗️ Project Structure

```
rnotes/
├── public/                 # Static assets and PWA files
├── src/
│   ├── app/               # Next.js app directory
│   ├── contexts/          # React contexts
│   └── lib/               # Firebase configuration
└── package.json           # Dependencies and scripts
```

## 📱 PWA Features

- **Offline support** via service worker
- **Install prompt** for mobile/desktop
- **Responsive design** for all devices

## 🚀 Deployment

Deploy easily on [Vercel](https://vercel.com/new) or Firebase Hosting.

Check out the [deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
