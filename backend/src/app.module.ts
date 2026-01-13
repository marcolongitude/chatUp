import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './presentation/modules/auth.module';
import { UsersModule } from './presentation/modules/users.module';
import { ChatModule } from './presentation/modules/chat.module'; // Added ChatModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUserEntity } from './infra/database/entities/typeorm-user.entity';
import { TypeOrmMessageEntity } from './infra/database/entities/typeorm-message.entity';

import { KeysModule } from './presentation/modules/keys.module';
import { Key } from './core/entities/key.entity';
import { PreKey } from './core/entities/pre-key.entity';
import { LocationModule } from './presentation/modules/location.module';
import { FilesModule } from './presentation/modules/files.module';
import { ElectricModule } from './infra/database/electric.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Suporta DATABASE_URL (Railway) ou variáveis individuais
      ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL,
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
          }
        : {
            host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
            port: parseInt(
              process.env.DB_PORT || process.env.PGPORT || '5432',
              10,
            ),
            username: process.env.DB_USERNAME || process.env.PGUSER || 'admin',
            password:
              process.env.DB_PASSWORD || process.env.PGPASSWORD || 'password',
            database: process.env.DB_NAME || process.env.PGDATABASE || 'chatup',
          }),
      entities: [TypeOrmUserEntity, TypeOrmMessageEntity, Key, PreKey], // Add Entities
      synchronize: true, // Temporariamente habilitado para criar tabelas automaticamente
      migrations: ['dist/infra/database/migrations/*.js'],
      migrationsRun: false, // Desabilitado temporariamente
      logging: process.env.NODE_ENV !== 'production', // Disable SQL logging in production
      // Connection pool settings for better performance
      extra: {
        max: 10, // Maximum connections in pool
        connectionTimeoutMillis: 10000, // 10 seconds
        idleTimeoutMillis: 30000, // 30 seconds
      },
    }),
    ElectricModule,
    AuthModule,
    UsersModule,
    ChatModule,
    KeysModule,
    LocationModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
