import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Client } from 'pg';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Tentar habilitar wal_level = logical via código
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      await client.query("ALTER SYSTEM SET wal_level = 'logical'");
      logger.log('✅ Comando wal_level=logical enviado com sucesso!');
      logger.log('⚠️ IMPORTANTE: Vá no Dashboard do Railway agora e REINICIE o serviço Postgres.');
    } catch (err) {
      logger.warn('❌ Não foi possível definir wal_level via código (provavelmente falta de permissão): ' + err.message);
    } finally {
      await client.end();
    }
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
