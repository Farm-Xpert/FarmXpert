# PostgreSQL 16 with the two extensions the migrations create:
# PostGIS (farm locations) and pgvector (the knowledge index).
FROM postgis/postgis:16-3.4

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-pgvector \
 && rm -rf /var/lib/apt/lists/*
