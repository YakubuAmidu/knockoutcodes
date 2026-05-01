import helmet from "helmet";

export default function securityHeaders() {
  // eslint-disable-next-line no-undef
  const isProd = process.env.NODE_ENV === "production";

  return helmet({
    hidePoweredBy: true,
    noSniff: true,
    frameguard: { action: "deny" },
    hsts: isProd
      ? { maxAge: 15552000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
      },
    },
  });
}