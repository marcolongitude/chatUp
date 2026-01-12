import { DataSource } from 'typeorm';
import { TypeOrmUserEntity } from './entities/typeorm-user.entity';
import { TypeOrmMessageEntity } from './entities/typeorm-message.entity';
import { Key } from '../../core/entities/key.entity';
import { PreKey } from '../../core/entities/pre-key.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'chatup',
  entities: [TypeOrmUserEntity, TypeOrmMessageEntity, Key, PreKey],
  migrations: ['src/infra/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});

