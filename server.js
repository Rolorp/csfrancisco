require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const REQUIRED_ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'MAIL_TO'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = parseInt(process.env.PORT, 10) || 3000;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10);

const app = express();
const upload = multer({ limits: { fieldSize: 10_000, fields: 20 } });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  pool: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas solicitudes. Por favor, inténtelo más tarde.',
});

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const sanitizeHeader = (s) => String(s ?? '').replace(/[\r\n]/g, ' ').trim();

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static(path.join(__dirname)));

async function sendForm(req, res, { requiredFields, buildMail, validate }) {
  for (const f of requiredFields) {
    if (!req.body[f] || !String(req.body[f]).trim()) {
      return res.status(400).send('Por favor, complete todos los campos requeridos.');
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
    console.error('Mail error:', err.message);
    res.status(500).send('Error al enviar el mensaje. Por favor, inténtelo más tarde.');
  }
}

app.post('/forms/appointment', formLimiter, upload.none(), (req, res) =>
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

app.post('/forms/contact', formLimiter, upload.none(), (req, res) =>
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
