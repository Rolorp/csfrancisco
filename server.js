require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const REQUIRED_ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'MAIL_TO'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = parseInt(process.env.PORT, 10) || 3000;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10);

const FIELD_LIMITS = {
  name: 100,
  email: 254,
  phone: 40,
  subject: 200,
  date: 40,
  department: 100,
  doctor: 100,
  message: 5000,
};

const app = express();
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
const upload = multer({ limits: { fieldSize: 10_000, fields: 20, files: 0 } });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  pool: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `appointment:${req.ip}`,
  message: 'Demasiadas solicitudes. Por favor, inténtelo más tarde.',
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `contact:${req.ip}`,
  message: 'Demasiadas solicitudes. Por favor, inténtelo más tarde.',
});

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const sanitizeHeader = (s) => String(s ?? '').replace(/[\r\n]/g, ' ').trim();

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const isValidEmail = (s) => typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'default-src': ["'self'"],
        'base-uri':    ["'self'"],
        'form-action': ["'self'"],
        'script-src':  ["'self'"],
        'style-src':   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        'font-src':    ["'self'", 'fonts.gstatic.com', 'data:'],
        'img-src':     ["'self'", 'data:', 'https://www.google.com', 'https://maps.gstatic.com'],
        'frame-src':   ["'self'", 'https://www.google.com', 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      },
    },
  })
);

app.use((req, res, next) => {
  if (/^\/(server\.js|package(-lock)?\.json|\.env.*|README\.md|node_modules)(\/|$)/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(__dirname, { dotfiles: 'deny' }));

async function sendForm(req, res, { requiredFields, buildMail, validate }) {
  for (const f of requiredFields) {
    if (!req.body[f] || !String(req.body[f]).trim()) {
      return res.status(400).send('Por favor, complete todos los campos requeridos.');
    }
  }
  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    if (req.body[field] && String(req.body[field]).length > max) {
      return res.status(400).send(`El campo "${field}" excede la longitud máxima permitida.`);
    }
  }
  if (!isValidEmail(req.body.email)) {
    return res.status(400).send('Por favor, ingrese un email válido.');
  }
  if (validate) {
    const err = validate(req.body);
    if (err) return res.status(400).send(err);
  }

  try {
    await transporter.sendMail(buildMail(req.body));
    res.send('OK');
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).send('Error al enviar el mensaje. Por favor, inténtelo más tarde.');
  }
}

app.post('/forms/appointment', appointmentLimiter, upload.none(), (req, res) =>
  sendForm(req, res, {
    requiredFields: ['name', 'email', 'phone', 'date', 'department', 'doctor'],
    buildMail: (b) => ({
      from: { name: sanitizeHeader(b.name), address: process.env.SMTP_FROM },
      replyTo: sanitizeHeader(b.email),
      to: process.env.MAIL_TO,
      subject: 'Nueva Solicitud de Cita - Clínica San Francisco',
      html: `
        <h2>Solicitud de Cita</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(b.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(b.email)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(b.phone)}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(b.date)}</p>
        <p><strong>Departamento:</strong> ${escapeHtml(b.department)}</p>
        <p><strong>Doctor:</strong> ${escapeHtml(b.doctor)}</p>
        <p><strong>Mensaje:</strong> ${escapeHtml(b.message) || '—'}</p>
      `,
    }),
  })
);

app.post('/forms/contact', contactLimiter, upload.none(), (req, res) =>
  sendForm(req, res, {
    requiredFields: ['name', 'email', 'subject', 'message'],
    validate: (b) => (b.message.length < 10 ? 'El mensaje debe tener al menos 10 caracteres.' : null),
    buildMail: (b) => ({
      from: { name: sanitizeHeader(b.name), address: process.env.SMTP_FROM },
      replyTo: sanitizeHeader(b.email),
      to: process.env.MAIL_TO,
      subject: `Contacto: ${sanitizeHeader(b.subject)}`,
      html: `
        <h2>Mensaje de Contacto</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(b.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(b.email)}</p>
        <p><strong>Asunto:</strong> ${escapeHtml(b.subject)}</p>
        <p><strong>Mensaje:</strong> ${escapeHtml(b.message)}</p>
      `,
    }),
  })
);

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    transporter.close();
    console.log('Closed cleanly');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
