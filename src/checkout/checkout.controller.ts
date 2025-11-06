import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateSessionRequest } from './dto/create-session.request';
import { StripeWebhookEvent } from './dto/stripe-webhook.dto';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('session')
  @UseGuards(JwtAuthGuard)
  async createSession(@Body() request: CreateSessionRequest) {
    return this.checkoutService.createSession(request.productId);
  }

  @Post('webhook')
  async handleCheckoutWebhooks(
    @Body() event: StripeWebhookEvent,
    @Headers('stripe-signature') signature: string,
    @Req() request: Request & { rawBody?: Buffer },
  ) {
    // Validasi input sebelum process
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    return this.checkoutService.handleCheckoutWebhook(
      event,
      signature,
      request.rawBody,
    );
  }
}
