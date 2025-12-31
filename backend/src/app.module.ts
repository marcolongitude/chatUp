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
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL 
        ? undefined 
        : (process.env.DB_HOST || process.env.PGHOST || 'localhost'),
      port: process.env.DATABASE_URL 
        ? undefined 
        : parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
      username: process.env.DATABASE_URL 
        ? undefined 
        : (process.env.DB_USERNAME || process.env.PGUSER || 'admin'),
      password: process.env.DATABASE_URL 
        ? undefined 
        : (process.env.DB_PASSWORD || process.env.PGPASSWORD || 'password'),
      database: process.env.DATABASE_URL 
        ? undefined 
        : (process.env.DB_NAME || process.env.PGDATABASE || 'chatup'),
      entities: [TypeOrmUserEntity, TypeOrmMessageEntity, Key, PreKey], // Add Entities
      synchronize: process.env.NODE_ENV !== 'production', // Disable in production, use migrations
      migrations: ['dist/infra/database/migrations/*.js'],
      migrationsRun: process.env.NODE_ENV === 'production', // Run migrations automatically in production
      logging: process.env.NODE_ENV !== 'production', // Disable SQL logging in production
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
