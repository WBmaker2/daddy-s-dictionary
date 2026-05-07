import { DEFAULT_EXPECTED_STATS, loadRepositoryData, validateDataSet } from "./data-validation.mjs";

function parseArgs(argv) {
  let mode = "strict";

  for (const arg of argv) {
    if (arg === "--strict") {
      mode = "strict";
      continue;
    }

    if (arg === "--partial") {
      mode = "partial";
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { mode };
}

try {
  const { mode } = parseArgs(process.argv.slice(2));
  const dataSet = loadRepositoryData({ rootDir: process.cwd(), mode });
  const result = validateDataSet(dataSet, { expectedStats: DEFAULT_EXPECTED_STATS });

  if (!result.ok) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Data check passed (${mode}).`);
    console.log(JSON.stringify(result.summary, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
