# 🏥 Clínica San Francisco de Asís - Chachapoyas

Official repository for the web platform of **Clínica San Francisco de Asís**, located in Chachapoyas, Amazonas, Peru. This project provides a modern, fast, and accessible interface for our patients.

---

## 🚀 Project Overview
A static website served by a small Node.js/Express backend that handles the contact and appointment forms via SMTP.

### Tech Stack
* **Frontend:** HTML5, CSS3 (Sass), JavaScript, Bootstrap 5.3
* **UI Libraries:** AOS, GLightbox, Swiper
* **Backend:** Node.js + Express + Nodemailer
* **Security:** Helmet, express-rate-limit, input sanitization

---

## 🛠️ Project Structure
* `/assets` — images, styles (CSS/SCSS), and JavaScript
* `/assets/vendor` — third-party libraries (Bootstrap, FontAwesome, etc.)
* `server.js` — Express server with form handlers
* `index.html` — main landing page

---

## ⚙️ Local Setup

**Requirements:** Node.js 18 or newer.

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file based on the template
cp .env.example .env
# then edit .env with your real SMTP credentials

# 3. Start the server
npm start          # production
npm run dev        # development with auto-reload (nodemon)
```

The site is served at `http://localhost:3000`.

### Required environment variables
| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | "From" address used in outgoing emails |
| `MAIL_TO` | Inbox that receives form submissions |
| `PORT` | (optional) HTTP port, defaults to `3000` |

The server fails fast at startup if any required variable is missing.

---

## 📍 Location & Contact
* **City:** Chachapoyas, Amazonas, Peru
* **Mission:** Providing healthcare services with excellence and human warmth

---

## 👨‍💻 Development & Maintenance
1. Sync the local repository with the `main` branch
2. Implement and test changes locally
3. Push to `main`

---
© 2026 Clínica San Francisco de Asís. All rights reserved.
