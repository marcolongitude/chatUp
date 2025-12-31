import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV');
        
        const logger = new Logger('DatabaseConfig');
        if (databaseUrl) {
          logger.log('DATABASE_URL detectada! Conectando ao banco remoto...');
        } else {
          logger.warn('DATABASE_URL NÃO encontrada. Usando configurações padrão (localhost).');
        }

        return {
          type: 'postgres',
          url: databaseUrl,
          host: databaseUrl 
            ? undefined 
            : configService.get<string>('DB_HOST') || configService.get<string>('PGHOST') || 'localhost',
          port: databaseUrl 
            ? undefined 
            : parseInt(configService.get<string>('DB_PORT') || configService.get<string>('PGPORT') || '5432', 10),
          username: databaseUrl 
            ? undefined 
            : configService.get<string>('DB_USERNAME') || configService.get<string>('PGUSER') || 'admin',
          password: databaseUrl 
            ? undefined 
            : configService.get<string>('DB_PASSWORD') || configService.get<string>('PGPASSWORD') || 'password',
          database: databaseUrl 
            ? undefined 
            : configService.get<string>('DB_NAME') || configService.get<string>('PGDATABASE') || 'chatup',
          entities: [TypeOrmUserEntity, TypeOrmMessageEntity, Key, PreKey],
          synchronize: nodeEnv !== 'production',
          migrations: ['dist/infra/database/migrations/*.js'],
          migrationsRun: nodeEnv === 'production',
          logging: nodeEnv !== 'production',
        };
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
