# Dance With Me App

This repository contains a simple starter implementation of the **Dance With Me** app: a social platform for meeting people at events, swiping to connect, and chatting in groups or privately.

## Structure

- `server/` – Node.js/Express backend with MongoDB and Socket.IO.
  - `index.js` – sets up API endpoints for events and users, connects to MongoDB, and configures Socket.IO for chat.
  - `package.json` – lists dependencies and scripts.
- `app/` – React Native (Expo) mobile app.
  - `App.js` – main entry file with a bottom tab navigator for Events, Swipe, Chats, and Profile.
  - `package.json` – lists dependencies for the Expo app.

## Running Locally

1. **Backend**:
   ```bash
   cd server
   npm install
   npm start
   ```
   The server starts on port 4000 by default. It requires a MongoDB URI. When deploying on Render, set `MONGODB_URI` in the environment.

2. **Mobile app**:
   ```bash
   cd app
   npm install
   npm start
   ```
   With [Expo Go](https://expo.dev/client), scan the QR code to run the app on your device. Update `API_BASE` and `SOCKET_URL` at the top of `App.js` with your deployed backend URL.

## Deploying

The server can be deployed to Render or another Node hosting provider. Make sure to set the following environment variables:

- `MONGODB_URI` – connection string for your MongoDB Atlas cluster.
- `PORT` – optional; defaults to 4000.

The mobile app can be run via [Expo Snack](https://snack.expo.dev) by copying the contents of `app/` into a new Snack and updating the API URL constants.

This project is meant as a starting point and leaves room for further development, including user authentication, real matching logic, event invites, and profile photos.