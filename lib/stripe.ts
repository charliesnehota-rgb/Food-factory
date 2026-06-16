// Stripe — serverový helper (použije se v API route / server action ve fázi 2).
//
// Záměrně zatím bez importu balíčku, aby v1 build prošel i bez konfigurace.
// Až budeme dělat checkout, odkomentuj a doplň:
//
//   import Stripe from "stripe";
//   export const stripe = process.env.STRIPE_SECRET_KEY
//     ? new Stripe(process.env.STRIPE_SECRET_KEY)
//     : null;
//
// Tok platby:
//   1) klient -> server action vytvoří Checkout Session / PaymentIntent
//   2) zákazník zaplatí
//   3) Stripe webhook potvrdí platbu -> objednávka v DB = "paid"
//   4) teprve pak se pustí do kuchyně / vytvoří rozvoz
//
// Klíče POUZE v .env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
