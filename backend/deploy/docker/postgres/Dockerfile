FROM postgres:15-alpine

# Expõe a porta padrão
EXPOSE 5432

# O comando abaixo inicializa o Postgres com as configurações necessárias para Replicação Lógica
# que o Electric SQL exige.
CMD ["postgres", \
     "-c", "wal_level=logical", \
     "-c", "max_replication_slots=10", \
     "-c", "max_wal_senders=10", \
     "-c", "shared_preload_libraries=pgoutput"]
