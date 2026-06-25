# UPSC Gurukul

A full-stack UPSC preparation assistant with a React + Vite frontend and an Express/MongoDB backend. The app uses Google Gemini AI for generating study material, historical timelines, quizzes, current affairs scraping, and more.

## Project structure

- `Backend/`
  - `server.js` - application entry point
  - `src/app.js` - Express app and middleware setup
  - `src/config/aiConfig.js` - Google Gemini AI integration
  - `src/controllers/aiController.js` - AI generation, scraping, and history endpoints
  - `src/controllers/userController.js` - user onboarding and metrics
  - `src/db/db.js` - MongoDB connection
  - `src/models/StudyMaterial.model.js` - saved material schema
  - `src/models/User.model.js` - user schema
  - `src/routes/aiRoutes.js` - AI-related routes
  - `src/routes/userRoutes.js` - user-related routes
- `upsc-gurukul-frontend/`
  - `src/App.jsx` - main React application
  - `src/main.jsx` - React entry point
  - `src/index.css` - global styles
  - `vite.config.js` - Vite configuration
  - `eslint.config.js` - ESLint rules

## Prerequisites

- Node.js 20+ recommended
- npm
- MongoDB Atlas or local MongoDB instance
- Google Gemini API key

## Backend setup

1. Open `Backend/`.
2. Create a `.env` file with:

```env
PORT=5000
MONGO_URI=your-mongodb-connection-string
GEMINI_API_KEY=your-google-gemini-api-key
```

3. Install backend dependencies:

```bash
cd Backend
npm install
```

4. Start backend server:

```bash
npm run dev
```

## Frontend setup

1. Open `upsc-gurukul-frontend/`.
2. Create a `.env` file with:

```env
VITE_API_BASE=http://localhost:5000
```

3. Install frontend dependencies:

```bash
cd upsc-gurukul-frontend
npm install
```

4. Start the frontend:

```bash
npm run dev
```

## Notes on environment and API configuration

- The frontend now uses `import.meta.env.VITE_API_BASE` to configure the backend base URL.
- If `VITE_API_BASE` is not set, the frontend falls back to `http://localhost:5000`.
- The backend reads `PORT`, `MONGO_URI`, and `GEMINI_API_KEY` from `Backend/.env`.
- Do not commit `.env` files containing secrets.

## Available scripts

### Backend

- `npm run dev` - start Express server with nodemon
- `npm start` - start Express server once

### Frontend

- `npm run dev` - start Vite dev server
- `npm run build` - build production assets
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Recommended workflow

1. Start the backend with `cd Backend && npm run dev`.
2. Start the frontend with `cd upsc-gurukul-frontend && npm run dev`.
3. Open the frontend URL shown by Vite, then use the app to generate UPSC study materials.

## Security reminder

- Replace placeholder credentials with secure values.
- Store API keys in `.env`, not in source control.
