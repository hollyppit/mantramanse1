// Separate fresh test process, fixed PostgreSQL major; never connects to hosted DBs.
process.env.RAG_TEST_PG_MAJOR='17';
require('./rag-postgres-integration.cjs');
