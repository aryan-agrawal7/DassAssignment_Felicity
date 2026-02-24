# Felicity - Event Management System

## Technologies & Libraries Used

### Frontend (React + Vite)
- **React (`react`, `react-dom`)**: Core UI library for building the interactive single-page application.
- **Vite**: Modern, blazing-fast build tool and development server.
- **React Router DOM (`react-router-dom`)**: Handles client-side routing for navigating between dashboards, event details, and profiles without page reloads.
- **Fuse.js (`fuse.js`)**: Lightweight fuzzy-search library used to provide robust and typo-tolerant searching through events and organizers.
- **Socket.io Client (`socket.io-client`)**: Enables real-time, bidirectional communication for features like team chat.
- **React Turnstile (`@marsidev/react-turnstile`)**: Cloudflare Turnstile integration used for bot protection/CAPTCHA during authentication.
- **React Google reCAPTCHA (`react-google-recaptcha`)**: Google reCAPTCHA integration for alternative bot protection.
- **HTML5 QR Code (`html5-qrcode`)**: Used by organizers to scan participant event tickets (QR codes) for attendance tracking.

### Backend (Node.js + Express)
- **Express (`express`)**: Fast, unopinionated web framework for Node.js used to build the RESTful APIs.
- **Mongoose (`mongoose`)**: Elegant MongoDB object modeling for Node.js to define database schemas and interact securely with the NoSQL database.
- **JSON Web Token (`jsonwebtoken`)**: Used for securely transmitting information between frontend and backend as a JSON object, specifically for user authentication and authorization (stateless sessions).
- **Bcrypt (`bcrypt`)**: Password-hashing function used to securely hash user passwords before storing them in the database.
- **Socket.io (`socket.io`)**: Enables real-time socket connections for real-time team chat functionality.
- **Nodemailer (`nodemailer`)**: Module for sending emails from Node.js, often used for password reset requests or event notifications.
- **QR Code (`qrcode`)**: Generates QR codes on the backend that are attached to participant tickets.
- **Cors (`cors`)**: Middleware to enable Cross-Origin Resource Sharing, allowing the frontend application to securely request data from the backend API.
- **Dotenv (`dotenv`)**: Loads environment variables from a `.env` file into `process.env`, separating secrets from source code. (Note: for this assignment `.env` files are explicitly exposed for team access).
