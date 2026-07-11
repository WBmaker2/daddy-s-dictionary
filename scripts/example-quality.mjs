function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWordBoundaryAtStart(value) {
  return /^[A-Za-z0-9]/.test(value);
}

function hasWordBoundaryAtEnd(value) {
  return /[A-Za-z0-9]$/.test(value);
}

function createTargetPattern(word) {
  const escapedWord = escapeRegExp(word);
  const prefix = hasWordBoundaryAtStart(word) ? "\\b" : "";
  const suffix = hasWordBoundaryAtEnd(word) ? "\\b" : "";

  return new RegExp(`${prefix}${escapedWord}${suffix}`, "gi");
}

export function normalizeExampleTemplate(word, sentence) {
  const targetWord = typeof word === "string" ? word.trim() : "";
  const exampleSentence = typeof sentence === "string" ? sentence.trim() : "";

  if (!targetWord) {
    return exampleSentence;
  }

  return exampleSentence.replace(createTargetPattern(targetWord), "{word}");
}

export function validateExampleQuality({ items, words, maxTemplateRatio = 0.2 }) {
  const errors = [];
  const safeItems = Array.isArray(items) ? items : [];
  const safeWords = Array.isArray(words) ? words : [];
  const allowedTemplateRatio = Number.isFinite(maxTemplateRatio) ? maxTemplateRatio : 0.2;
  const wordsById = new Map();
  const seenWordIds = new Set();
  const seenExampleIds = new Set();
  const templateCounts = new Map();

  for (const word of safeWords) {
    if (!Number.isInteger(word?.id) || word.id <= 0) {
      continue;
    }

    if (seenWordIds.has(word.id)) {
      errors.push(`duplicate dictionary id ${word.id}`);
      continue;
    }

    seenWordIds.add(word.id);
    wordsById.set(word.id, word);
  }

  let nonEmptyExamples = 0;

  for (const item of safeItems) {
    if (!Number.isInteger(item?.id) || item.id <= 0) {
      errors.push("example item must have a positive integer id");
      continue;
    }

    if (seenExampleIds.has(item.id)) {
      errors.push(`duplicate example id ${item.id}`);
      continue;
    }

    seenExampleIds.add(item.id);
    const word = wordsById.get(item.id);

    if (!word) {
      errors.push(`example id ${item.id} does not reference a dictionary word`);
      continue;
    }

    if (typeof item.exampleSentence !== "string" || item.exampleSentence.trim().length === 0) {
      errors.push(`example id ${item.id} must have a non-empty sentence`);
      continue;
    }

    nonEmptyExamples += 1;
    const template = normalizeExampleTemplate(word.word, item.exampleSentence);
    templateCounts.set(template, (templateCounts.get(template) ?? 0) + 1);
  }

  for (const id of seenWordIds) {
    if (!seenExampleIds.has(id)) {
      errors.push(`dictionary id ${id} is missing an example`);
    }
  }

  for (const [template, count] of templateCounts) {
    const ratio = nonEmptyExamples === 0 ? 0 : count / nonEmptyExamples;

    if (ratio > allowedTemplateRatio) {
      errors.push(
        `example template ${JSON.stringify(template)} appears ${(ratio * 100).toFixed(1)}%, above the ${(allowedTemplateRatio * 100).toFixed(1)}% limit`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      totalItems: safeItems.length,
      dictionaryIds: seenWordIds.size,
      exampleIds: seenExampleIds.size,
      nonEmptyExamples,
      templateCounts: Object.fromEntries(templateCounts)
    }
  };
}
