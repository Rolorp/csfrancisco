require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.post('/forms/appointment', upload.none(), async (req, res) => {
  const { name, email, phone, date, department, doctor, message } = req.body;

  if (!name || !email || !phone || !date || !department || !doctor) {
    return res.status(400).send('Please fill in all required fields.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Please enter a valid email address.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"${name}" <${process.env.SMTP_FROM}>`,
    replyTo: email,
    to: process.env.MAIL_TO,
    subject: 'Nueva Solicitud de Cita - Clínica San Francisco',
    html: `
      <h2>Solicitud de Cita</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phone}</p>
      <p><strong>Fecha:</strong> ${date}</p>
      <p><strong>Departamento:</strong> ${department}</p>
      <p><strong>Doctor:</strong> ${doctor}</p>
      <p><strong>Mensaje:</strong> ${message || '—'}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send('OK');
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).send('Error al enviar el mensaje. Por favor, inténtelo más tarde.');
  }
});

app.post('/forms/contact', upload.none(), async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).send('Please fill in all required fields.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Please enter a valid email address.');
  }

  if (message.length < 10) {
    return res.status(400).send('Message must be at least 10 characters.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"${name}" <${process.env.SMTP_FROM}>`,
    replyTo: email,
    to: process.env.MAIL_TO,
    subject: `Contacto: ${subject}`,
    html: `
      <h2>Mensaje de Contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Asunto:</strong> ${subject}</p>
      <p><strong>Mensaje:</strong> ${message}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send('OK');
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).send('Error al enviar el mensaje. Por favor, inténtelo más tarde.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
