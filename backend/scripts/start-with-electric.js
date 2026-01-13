#!/usr/bin/env node

/**
 * Script para iniciar Backend NestJS + Electric SQL no mesmo processo
 * Usa child_process para rodar Electric SQL como processo filho
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('🚀 Iniciando Backend + Electric SQL...\n');

// Configurações do Electric SQL
const ELECTRIC_PORT = process.env.ELECTRIC_PORT || '5133';
const DATABASE_URL = process.env.DATABASE_URL;

// Parse DATABASE_URL to extract connection details for logical replication
let parsedDbUrl = null;
if (DATABASE_URL) {
  try {
    const url = new URL(DATABASE_URL);
    parsedDbUrl = {
      host: url.hostname,
      port: url.port || '5432',
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
    };
  } catch (e) {
    console.warn('⚠️  Erro ao fazer parse do DATABASE_URL:', e.message);
  }
}

const AUTH_MODE = process.env.AUTH_MODE || 'insecure';
const LOGICAL_PUBLISHER_HOST =
  process.env.LOGICAL_PUBLISHER_HOST || parsedDbUrl?.host;
const LOGICAL_PUBLISHER_PORT =
  process.env.LOGICAL_PUBLISHER_PORT || parsedDbUrl?.port || '5432';
const LOGICAL_PUBLISHER_USER =
  process.env.LOGICAL_PUBLISHER_USER || parsedDbUrl?.user;
const LOGICAL_PUBLISHER_PASSWORD =
  process.env.LOGICAL_PUBLISHER_PASSWORD || parsedDbUrl?.password;
const LOGICAL_PUBLISHER_DATABASE =
  process.env.LOGICAL_PUBLISHER_DATABASE || parsedDbUrl?.database;

let electricProcess = null;

// Função para iniciar Electric SQL via Docker (se disponível)
function startElectric() {
  if (!DATABASE_URL) {
    console.warn(
      '⚠️  DATABASE_URL não configurada, Electric SQL não será iniciado',
    );
    return;
  }

  console.log('⚡ Iniciando Electric SQL...');
  console.log(`📋 Configuração:`);
  console.log(`   - Porta: ${ELECTRIC_PORT}`);
  console.log(`   - AUTH_MODE: ${AUTH_MODE}`);
  console.log(
    `   - DATABASE_URL: ${DATABASE_URL ? '✅ Configurada' : '❌ Não configurada'}`,
  );
  if (LOGICAL_PUBLISHER_HOST) {
    console.log(
      `   - Logical Publisher: ${LOGICAL_PUBLISHER_HOST}:${LOGICAL_PUBLISHER_PORT}`,
    );
  }

  // Tentar usar Docker para rodar Electric SQL
  // Railway pode ter Docker disponível
  try {
    // Verificar se Docker está disponível
    execSync('which docker', { stdio: 'ignore' });
    console.log('🐳 Docker encontrado, iniciando Electric SQL via Docker...');

    // Build Docker command with all required environment variables
    const dockerArgs = [
      'run',
      '--rm',
      '--network',
      'host',
      '-e',
      `DATABASE_URL=${DATABASE_URL}`,
      '-e',
      `AUTH_MODE=${AUTH_MODE}`,
      '-e',
      'ELECTRIC_WRITE_TO_PG_MODE=direct',
      '-p',
      `${ELECTRIC_PORT}:5133`,
      'electricsql/electric:latest',
    ];

    // Always set logical replication parameters (required for Electric SQL)
    if (
      LOGICAL_PUBLISHER_HOST &&
      LOGICAL_PUBLISHER_USER &&
      LOGICAL_PUBLISHER_PASSWORD &&
      LOGICAL_PUBLISHER_DATABASE
    ) {
      dockerArgs.push('-e', `LOGICAL_PUBLISHER_HOST=${LOGICAL_PUBLISHER_HOST}`);
      dockerArgs.push('-e', `LOGICAL_PUBLISHER_PORT=${LOGICAL_PUBLISHER_PORT}`);
      dockerArgs.push('-e', `LOGICAL_PUBLISHER_USER=${LOGICAL_PUBLISHER_USER}`);
      dockerArgs.push(
        '-e',
        `LOGICAL_PUBLISHER_PASSWORD=${LOGICAL_PUBLISHER_PASSWORD}`,
      );
      dockerArgs.push(
        '-e',
        `LOGICAL_PUBLISHER_DATABASE=${LOGICAL_PUBLISHER_DATABASE}`,
      );
      console.log('✅ Configuração de logical replication detectada');
    } else {
      console.warn(
        '⚠️  Parâmetros de logical replication não configurados completamente',
      );
      console.warn('   Electric SQL pode não funcionar corretamente');
    }

    electricProcess = spawn('docker', dockerArgs, {
      stdio: 'inherit',
      shell: false,
    });

    electricProcess.on('error', (err) => {
      console.error('❌ Erro ao iniciar Electric SQL via Docker:', err.message);
      console.log('💡 Tentando método alternativo...');
      startElectricAlternative();
    });

    electricProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ Electric SQL encerrou com código ${code}`);
      }
    });

    // Aguardar Electric iniciar
    setTimeout(() => {
      checkElectricHealth();
    }, 5000);
  } catch (err) {
    console.log('🐳 Docker não disponível, tentando método alternativo...');
    startElectricAlternative();
  }
}

// Método alternativo: tentar baixar e executar binário
function startElectricAlternative() {
  console.log(
    '📦 Método alternativo: Electric SQL precisa ser configurado separadamente',
  );
  console.log('💡 Configure Electric SQL como serviço separado ou use Docker');
}

// Verificar se Electric está rodando
function checkElectricHealth() {
  let attempts = 0;
  const maxAttempts = 15; // 30 segundos total (15 * 2s)

  const checkInterval = setInterval(() => {
    attempts++;
    const req = http.get(`http://localhost:${ELECTRIC_PORT}/health`, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ Electric SQL está rodando na porta ${ELECTRIC_PORT}`);
        clearInterval(checkInterval);
      } else {
        console.log(
          `⏳ Electric SQL ainda não está pronto (tentativa ${attempts}/${maxAttempts})...`,
        );
      }
    });

    req.on('error', (err) => {
      if (attempts < maxAttempts) {
        console.log(
          `⏳ Electric SQL ainda não está pronto (tentativa ${attempts}/${maxAttempts})...`,
        );
      }
    });

    req.setTimeout(2000, () => {
      req.destroy();
    });

    if (attempts >= maxAttempts) {
      console.warn(
        `⚠️  Electric SQL não respondeu após ${maxAttempts} tentativas`,
      );
      console.warn('   Verifique os logs do Electric SQL para mais detalhes');
      clearInterval(checkInterval);
    }
  }, 2000);
}

// Iniciar Electric SQL em background (não bloqueia o backend)
// Se falhar, não impede o backend de iniciar
try {
  startElectric();
} catch (err) {
  console.warn('⚠️  Erro ao tentar iniciar Electric SQL:', err.message);
  console.warn('   Backend continuará sem Electric SQL');
}

// Iniciar Backend NestJS imediatamente (não espera Electric)
// O backend deve funcionar mesmo se Electric SQL não estiver disponível
console.log('📦 Iniciando Backend NestJS...\n');

// Verificar se dist/main.js existe
const fs = require('fs');
const path = require('path');
const mainJsPath = path.join(__dirname, '..', 'dist', 'main.js');

if (!fs.existsSync(mainJsPath)) {
  console.error('❌ Erro: dist/main.js não encontrado!');
  console.error('   Execute "npm run build" antes de iniciar o backend');
  process.exit(1);
}

const backendProcess = spawn('node', ['dist/main.js'], {
  env: process.env,
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

backendProcess.on('error', (err) => {
  console.error('❌ Erro ao iniciar Backend:', err);
  console.error('   Verifique se Node.js está instalado e dist/main.js existe');
  process.exit(1);
});

backendProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Backend encerrou com código de erro ${code}`);
  } else {
    console.log(`\n📦 Backend encerrou normalmente`);
  }
  if (electricProcess) {
    console.log('🛑 Encerrando Electric SQL...');
    electricProcess.kill();
  }
  process.exit(code || 0);
});

// Tratamento de sinais
process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM, encerrando processos...');
  if (electricProcess) electricProcess.kill();
  backendProcess.kill();
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT, encerrando processos...');
  if (electricProcess) electricProcess.kill();
  backendProcess.kill();
});
