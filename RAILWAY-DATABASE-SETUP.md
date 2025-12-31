# 🗄️ Configurar PostgreSQL no Railway

## Problema

O backend está tentando conectar ao PostgreSQL em `localhost:5432`, mas no Railway o PostgreSQL é um serviço separado e precisa usar variáveis de ambiente específicas.

## Solução

O Railway fornece automaticamente variáveis de ambiente quando você adiciona um serviço PostgreSQL. O código foi atualizado para suportar essas variáveis.

## Passos

### 1. Adicionar PostgreSQL no Railway

1. **No Railway Dashboard:**
   - Vá no seu projeto
   - Clique em **"New"** > **"Database"** > **"Add PostgreSQL"**
   - O Railway criará automaticamente um serviço PostgreSQL

### 2. Configurar Variáveis de Ambiente no Backend

O Railway fornece automaticamente as seguintes variáveis quando você adiciona um PostgreSQL:

- `DATABASE_URL` - URL completa de conexão (recomendado)
- `PGHOST` - Host do PostgreSQL
- `PGPORT` - Porta do PostgreSQL
- `PGUSER` - Usuário do PostgreSQL
- `PGPASSWORD` - Senha do PostgreSQL
- `PGDATABASE` - Nome do banco de dados

**O backend agora suporta automaticamente essas variáveis!**

### 3. Verificar Variáveis (Opcional)

No serviço backend, vá em **Variables** e verifique se as seguintes variáveis estão presentes (devem estar automáticas):

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGDATABASE=${{Postgres.PGDATABASE}}
```

**Nota:** Se você não vê essas variáveis, o Railway pode não ter vinculado o PostgreSQL ao backend. Para vincular:

1. No serviço backend > **Settings** > **Variables**
2. Clique em **"New Variable"**
3. Adicione manualmente:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`

### 4. Verificar Conexão

Após configurar, o backend deve conseguir conectar ao PostgreSQL. Verifique os logs:

```
[Nest] LOG [TypeOrmModule] TypeOrmModule dependencies initialized
```

Se ainda houver erro de conexão, verifique:

1. **PostgreSQL está rodando?**
   - Railway Dashboard > PostgreSQL > Status deve ser "Active"

2. **Variáveis estão configuradas?**
   - Railway Dashboard > Backend > Variables
   - Deve ter `DATABASE_URL` ou variáveis `PG*`

3. **Logs do PostgreSQL:**
   - Railway Dashboard > PostgreSQL > Logs
   - Deve mostrar "database system is ready to accept connections"

## Estrutura Final no Railway

```
Projeto ChatUp
├── chatup-backend (Node.js)
│   └── Variables:
│       └── DATABASE_URL=${{Postgres.DATABASE_URL}}
│
├── Postgres (banco de dados)
│   └── Criado automaticamente pelo Railway
│
└── electric-sql (Docker Image - opcional)
    └── Variables:
        └── DATABASE_URL=${{Postgres.DATABASE_URL}}
```

## Troubleshooting

### Erro: `ECONNREFUSED 127.0.0.1:5432`

**Causa:** Backend tentando conectar em `localhost` ao invés do serviço PostgreSQL do Railway.

**Solução:**
1. Verifique se o PostgreSQL está adicionado no projeto
2. Verifique se `DATABASE_URL` está configurada no backend
3. Reinicie o serviço backend após adicionar variáveis

### Erro: `password authentication failed`

**Causa:** Credenciais incorretas.

**Solução:**
1. Use `DATABASE_URL` que o Railway fornece automaticamente
2. Ou verifique se `PGUSER` e `PGPASSWORD` estão corretos

### Erro: `database "chatup" does not exist`

**Causa:** Banco de dados não foi criado.

**Solução:**
1. O Railway cria o banco automaticamente
2. Verifique se `PGDATABASE` está configurado corretamente
3. Ou use `DATABASE_URL` que já inclui o nome do banco

## Notas

- O Railway cria automaticamente o banco de dados quando você adiciona PostgreSQL
- As variáveis `PG*` são fornecidas automaticamente pelo Railway
- `DATABASE_URL` é a forma mais simples e recomendada de conectar
- O código agora suporta tanto `DATABASE_URL` quanto variáveis individuais (`DB_*` ou `PG*`)


