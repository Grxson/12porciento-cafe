import { runCatalogSync } from './catalog/sync-catalog';

runCatalogSync()
  .then((result) => console.table(result))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
