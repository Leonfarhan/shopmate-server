import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeWebhookEvent } from './dto/stripe-webhook.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly stripe: Stripe,
    private readonly productService: ProductsService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(productId: number) {
    const product = await this.productService.getProduct(productId);
    return this.stripe.checkout.sessions.create({
      metadata: {
        productId: productId.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: product.price * 100,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: this.configService.getOrThrow('STRIPE_SUCCESS_URL'),
      cancel_url: this.configService.getOrThrow('STRIPE_CANCEL_URL'),
    });
  }

  async handleCheckoutWebhook(
    event: StripeWebhookEvent,
    signature: string,
    rawBody: Buffer,
  ) {
    // STEP 1: Verify signature (security first!)
    const verifiedEvent = this.verifyWebhookSignature(rawBody, signature);

    // STEP 2: Handle event type
    switch (verifiedEvent.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(verifiedEvent);
        break;

      default:
        this.logger.log(`Unhandled event type: ${verifiedEvent.type}`);
    }

    return { received: true };
  }

  // Private method: Verify webhook signature
  private verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    try {
      const webhookSecret = this.configService.getOrThrow('STRIPE_WEBHOOK_SECRET');

      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // Private method: Handle checkout completed event
  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const productId = session.metadata?.productId;

    if (!productId) {
      this.logger.warn(`No productId in session metadata: ${session.id}`);
      return;
    }

    // Idempotency: Check apakah sudah diproses sebelumnya
    const product = await this.productService.getProduct(parseInt(productId));

    if (product.sold) {
      this.logger.log(`Product ${productId} already marked as sold`);
      return;
    }

    await this.productService.update(parseInt(productId), { sold: true });
    this.logger.log(`Product ${productId} marked as sold from session ${session.id}`);
  }
}
