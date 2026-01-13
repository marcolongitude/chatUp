import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 Iniciando NestJS Backend...');
    console.log(`📋 Porta: ${process.env.PORT ?? 3000}`);
    console.log(`📋 Ambiente: ${process.env.NODE_ENV ?? 'development'}`);

    const app = await NestFactory.create(AppModule);
    app.enableCors(); // Enable CORS for all origins

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');

    console.log(`✅ Backend rodando na porta ${port}`);
    console.log(`✅ Health check: http://0.0.0.0:${port}/health`);
  } catch (error) {
    console.error('❌ Erro ao iniciar backend:', error);
    process.exit(1);
  }
}
bootstrap();
