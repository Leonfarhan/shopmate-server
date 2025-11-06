import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CheckoutModule } from './checkout/checkout.module';
import { HealthController } from './health.controller';
import { getEnvironmentData } from 'worker_threads';
import { error } from 'console';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                  },
                },
            level: isProduction ? 'info' : 'debug',
          },
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot({
      validate: (config) => {
        const required = [
          'JWT_SECRET',
          'JWT_EXPIRATION',
          'DATABASE_URL',
          'STRIPE_SECRET_KEY'
        ]

        for (const key of required) {
          if(!config[key]) {
            throw new Error(`Missing required env var: ${key}`)
          }
        }

        return config
      },
      isGlobal: true  
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    CheckoutModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
