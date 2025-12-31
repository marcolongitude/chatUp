# 🔧 Correção Rápida: Erro de Conexão com Banco no Railway

## ❌ Erro Atual

```
ERROR [TypeOrmModule] Unable to connect to the database
Error: connect ECONNREFUSED 127.0.0.1:5432
```

## ✅ Solução

O backend foi atualizado para suportar as variáveis de ambiente do Railway. Agora você precisa:

### 1. Adicionar PostgreSQL no Railway

1. Railway Dashboard > Projeto > **"New"** > **"Database"** > **"Add PostgreSQL"**
2. O Railway criará automaticamente o serviço PostgreSQL

### 2. Vincular PostgreSQL ao Backend

**Opção A: Automático (Recomendado)**
- O Railway deve vincular automaticamente
- Verifique se o backend tem acesso ao PostgreSQL

**Opção B: Manual**
1. No serviço backend > **Settings** > **Variables**
2. Clique em **"New Variable"**
3. Adicione:
   - **Name:** `DATABASE_URL`
   - **Value:** `${{Postgres.DATABASE_URL}}`
4. Clique em **"Add"**

### 3. Verificar Variáveis

No serviço backend, você deve ter (automático ou manual):

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Ou as variáveis individuais:

```
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGDATABASE=${{Postgres.PGDATABASE}}
```

### 4. Reiniciar Backend

Após adicionar as variáveis:

1. Railway Dashboard > Backend > **Settings**
2. Clique em **"Redeploy"** ou aguarde o deploy automático

### 5. Verificar Logs

Após o redeploy, verifique os logs:

```
✅ Sucesso:
[Nest] LOG [TypeOrmModule] TypeOrmModule dependencies initialized

❌ Ainda com erro:
ERROR [TypeOrmModule] Unable to connect to the database
```

## 🎯 Checklist

- [ ] PostgreSQL adicionado no Railway
- [ ] Variável `DATABASE_URL` configurada no backend
- [ ] Backend reiniciado/redeployado
- [ ] Logs mostram conexão bem-sucedida

## 📚 Documentação Completa

Veja `RAILWAY-DATABASE-SETUP.md` para mais detalhes.


