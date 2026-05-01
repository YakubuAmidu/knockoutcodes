# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

=========================

# Mailer

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yakubuamidu577@gmail.com
SMTP_PASS=YOUR_NEW_GMAIL_APP_PASSWORD
MAIL_FROM_EMAIL=yakubuamidu577@gmail.com
MAIL_FROM_NAME=KnockoutCodes Support
COACHING_ADMIN_EMAIL=yakubuamidu577@gmail.com
APP_PUBLIC_URL=https://www.knockoutcodes.com

# Proof of Work (anti-spam)

POW_SECRET=some_long_random_string_here
POW_DIFFICULTY_BITS=16
POW_MIN_BITS=12
POW_MAX_BITS=22
POW_TTL_MS=300000
