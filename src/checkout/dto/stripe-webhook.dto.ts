// Stripe webhook event interface
// Fokus pada field yang kita butuhkan, bukan semua field dari Stripe
export interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      id: string;
      metadata?: Record<string, string>;
    };
  };
}
