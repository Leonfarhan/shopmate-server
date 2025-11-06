import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import Stripe from 'stripe';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductsModule } from '../products/products.module';
import { json } from 'express';

@Module({
  imports: [ConfigModule, ProductsModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    {
      provide: Stripe,
      useFactory: (configService: ConfigService) =>
        new Stripe(configService.getOrThrow('STRIPE_SECRET_KEY')),
      inject: [ConfigService],
    },
  ],
})
export class CheckoutModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        json({
          verify: (req: any, _res, buf) => {
            // Simpan raw body hanya untuk webhook route
            // Diperlukan untuk Stripe signature verification
            if (req.url === '/checkout/webhook') {
              req.rawBody = buf;
            }
          },
        }),
      )
      .forRoutes({ path: 'checkout/webhook', method: RequestMethod.POST });
  }
}
