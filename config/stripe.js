// config/stripe.js
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables.
dotenv.config({ path: ".env.server" });

// eslint-disable-next-line no-undef
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing in .env');
}

// eslint-disable-next-line no-undef
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia', // or the latest supported version
});
