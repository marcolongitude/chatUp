# Dockerfile para Electric SQL no Railway
# Railway pode usar este Dockerfile para rodar Electric SQL

FROM electricsql/electric:latest

# Electric SQL usa variáveis de ambiente
# Não precisa de build, apenas runtime config

# Expor porta
EXPOSE 5133

# Electric SQL já tem CMD definido na imagem base
# Apenas precisa das variáveis de ambiente configuradas

