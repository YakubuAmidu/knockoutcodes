// config/helmet.js
import helmet from "helmet";

export default function securityHeaders() {
  // eslint-disable-next-line no-undef
  const isProd = process.env.NODE_ENV === "production";

  return helmet({
    hidePoweredBy: true,

    noSniff: true,

    frameguard: {
      action: "deny",
    },

    hsts: isProd
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,

    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },

    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups",
    },

    crossOriginEmbedderPolicy: false,

    contentSecurityPolicy: {
      useDefaults: true,

      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://js.stripe.com",
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
        ],

        connectSrc: [
          "'self'",
          "https:",
          "ws:",
          "wss:",
        ],

        fontSrc: [
          "'self'",
          "https:",
          "data:",
        ],

        mediaSrc: [
          "'self'",
          "blob:",
          "https:",
        ],

        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
        ],

        objectSrc: ["'none'"],

        baseUri: ["'self'"],

        formAction: ["'self'"],

        frameAncestors: ["'none'"],
      },
    },
  });
}