import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";

const ROOT = process.cwd();
const GUIDE_PDF = path.join(ROOT, "kice-word-lister-guide.pdf");
const WORDBOOK_PDF = path.join(ROOT, "curriculum-wordbook.pdf");
const DICT_DIR = path.join(ROOT, "krdict-reader-master", "dict.entries.in");
const OUTPUT_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "words.json");

const CATEGORY_LABELS = {
  elementary: "초등학교 필수 영단어",
  middle: "중학교 필수 영단어",
  high: "고등학교 필수 영단어"
};

const CATEGORY_DESCRIPTIONS = {
  elementary: "공식 기본 어휘 목록에서 * 표시가 있는 초등 권장군",
  middle: "공식 기본 어휘 목록에서 ** 표시가 있는 중학교·고등 공통과목 권장군",
  high: "공식 기본 어휘 목록에서 표시가 없는 고등 확장 어휘군"
};

const MANUAL_FALLBACKS = {
  "twenty-first": {
    pronunciation: "ˌtwenti ˈfɜːrst",
    glosses: ["스물한 번째", "제21의"],
    glossText: "스물한 번째, 제21의"
  },
  "twenty-second": {
    pronunciation: "ˌtwenti ˈsekənd",
    glosses: ["스물두 번째", "제22의"],
    glossText: "스물두 번째, 제22의"
  },
  "twenty-third": {
    pronunciation: "ˌtwenti ˈθɜːrd",
    glosses: ["스물세 번째", "제23의"],
    glossText: "스물세 번째, 제23의"
  }
};

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function normalizeEnglish(value) {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKorean(value) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function isPageMarker(line) {
  return /^-\s*\d+\s*-$/.test(line);
}

function isLetterHeading(line) {
  return /^[A-Z]$/.test(line);
}

function needsContinuation(line) {
  const openParens = (line.match(/\(/g) || []).length;
  const closeParens = (line.match(/\)/g) || []).length;

  return openParens > closeParens || /[\/,]$/.test(line);
}

function splitVariants(value) {
  const parts = [];
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s*\((.+)\)$/);

  if (!match) {
    return [trimmed];
  }

  parts.push(match[1].trim());

  for (const extra of match[2].split(/\s*(?:,|\/)\s*/)) {
    if (extra.trim()) {
      parts.push(extra.trim());
    }
  }

  return parts;
}

function splitTopLevelVariants(value) {
  const parts = [];
  let current = "";
  let depth = 0;

  for (const char of value) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")" && depth > 0) {
      depth -= 1;
    }

    if (char === "/" && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseOfficialEntries(text) {
  const start = text.indexOf("기본 어휘 목록\n \nA");
  const end = text.indexOf("II. 기본 어휘 관련 지침 개정 내용", start + 1);

  if (start === -1 || end === -1) {
    throw new Error("Could not locate the official vocabulary list in the guide PDF.");
  }

  const rawLines = text
    .slice(start, end)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const mergedLines = [];

  for (const line of rawLines) {
    if (line === "기본 어휘 목록" || isLetterHeading(line) || isPageMarker(line)) {
      continue;
    }

    if (
      mergedLines.length > 0 &&
      (/^\(.+\)$/.test(line) || needsContinuation(mergedLines[mergedLines.length - 1]))
    ) {
      mergedLines[mergedLines.length - 1] += ` ${line}`;
      continue;
    }

    mergedLines.push(line);
  }

  const entries = mergedLines.map((line, index) => {
    const category = line.includes("**")
      ? "middle"
      : line.includes("*")
        ? "elementary"
        : "high";

    const cleaned = line.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    const forms = unique(
      splitTopLevelVariants(cleaned)
        .flatMap((variant) => splitVariants(variant))
        .map((variant) => variant.trim())
    );

    return {
      id: index + 1,
      raw: line,
      word: forms[0],
      forms,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      categoryDescription: CATEGORY_DESCRIPTIONS[category]
    };
  });

  return entries;
}

function buildDictionaryIndex() {
  ensureFile(DICT_DIR);

  const index = new Map();

  for (const fileName of fs.readdirSync(DICT_DIR)) {
    index.set(normalizeEnglish(fileName), path.join(DICT_DIR, fileName));
  }

  return index;
}

function parseWordbookEntries(text) {
  const cleanedText = text.replace(/\r/g, "");
  const regex =
    /^([A-Za-z][A-Za-z0-9 ./'-]*?)\s+\[([^\]]+)\]\s*:\s*([\s\S]*?)(?=^[A-Za-z][A-Za-z0-9 ./'-]*?\s+\[[^\]]+\]\s*:|\Z)/gm;
  const map = new Map();

  for (const match of cleanedText.matchAll(regex)) {
    const word = match[1].trim();
    const pronunciation = match[2].trim();
    const body = match[3].replace(/\s+/g, " ").trim();
    const glossChunk = body.split("•")[0].trim();
    const posPattern =
      /(?:n|pron|adj|v|adv|prep|conj|int|det|num|aux|art)(?:,\s*(?:n|pron|adj|v|adv|prep|conj|int|det|num|aux|art))*/i;
    const glossText = glossChunk
      .replace(
      /^(?:n|pron|adj|v|adv|prep|conj|int|det|num|aux|art)(?:,\s*(?:n|pron|adj|v|adv|prep|conj|int|det|num|aux|art))*\s+/i,
      ""
      )
      .replace(new RegExp(`\\s+${posPattern.source}\\s+`, "gi"), ", ");

    const glosses = unique(
      glossText
        .split(/\s*[,;/]\s*/)
        .map((value) => value.trim())
        .filter((value) => /[가-힣]/.test(value))
    );

    map.set(normalizeEnglish(word), {
      word,
      pronunciation,
      glossText,
      glosses
    });
  }

  return map;
}

function parseDictionaryFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const terms = unique(
    [...source.matchAll(/<dt><span>[^<]*<\/span>([^<]+)<\/dt>/g)]
      .map((match) => stripTags(match[1]).replace(/\s*\[[^\]]+\]/g, "").trim())
      .filter((value) => /[가-힣]/.test(value))
  );

  const descriptions = unique(
    [...source.matchAll(/<dd>(.*?)<\/dd>/g)]
      .map((match) => stripTags(match[1]))
      .filter((value) => /[가-힣]/.test(value) && value.length > 4)
  );

  const englishHints = unique(
    [...source.matchAll(/<dd>(.*?)<\/dd>/g)]
      .map((match) => stripTags(match[1]))
      .filter((value) => /[a-zA-Z]/.test(value) && !/[가-힣]/.test(value))
  );

  return {
    koreanTerms: terms.slice(0, 8),
    koreanDefinitions: descriptions.slice(0, 3),
    englishHints: englishHints.slice(0, 4)
  };
}

function collectDictionaryData(entry, dictIndex) {
  const matchedForms = [];
  const termPool = [];
  const definitionPool = [];
  const englishHintPool = [];

  for (const form of entry.forms) {
    const normalized = normalizeEnglish(form);
    const filePath = dictIndex.get(normalized);

    if (!filePath) {
      continue;
    }

    matchedForms.push(form);
    const parsed = parseDictionaryFile(filePath);
    termPool.push(...parsed.koreanTerms);
    definitionPool.push(...parsed.koreanDefinitions);
    englishHintPool.push(...parsed.englishHints);
  }

  return {
    matchedForms: unique(matchedForms),
    koreanTerms: unique(termPool).slice(0, 8),
    koreanDefinitions: unique(definitionPool).slice(0, 3),
    englishHints: unique(englishHintPool).slice(0, 4)
  };
}

function collectWordbookData(entry, wordbookIndex) {
  const matches = [];

  for (const form of entry.forms) {
    const record = wordbookIndex.get(normalizeEnglish(form));

    if (record) {
      matches.push(record);
    }
  }

  const manualFallback = MANUAL_FALLBACKS[normalizeEnglish(entry.word)];

  return {
    pronunciation: matches[0]?.pronunciation ?? manualFallback?.pronunciation ?? "",
    glosses: unique([...matches.flatMap((record) => record.glosses), ...(manualFallback?.glosses ?? [])]).slice(0, 6),
    glossText: matches[0]?.glossText ?? manualFallback?.glossText ?? ""
  };
}

function buildSearchKeywords(entry, dictData) {
  return {
    english: unique(entry.forms.map((form) => normalizeEnglish(form))),
    korean: unique(
      [...dictData.koreanTerms, ...dictData.koreanDefinitions].map((value) => normalizeKorean(value))
    )
  };
}

async function main() {
  ensureFile(GUIDE_PDF);
  ensureFile(WORDBOOK_PDF);
  ensureFile(DICT_DIR);

  const pdfBuffer = fs.readFileSync(GUIDE_PDF);
  const guide = await pdf(pdfBuffer);
  const wordbook = await pdf(fs.readFileSync(WORDBOOK_PDF));
  const officialEntries = parseOfficialEntries(guide.text);
  const dictIndex = buildDictionaryIndex();
  const wordbookIndex = parseWordbookEntries(wordbook.text);

  const words = officialEntries.map((entry) => {
    const dictData = collectDictionaryData(entry, dictIndex);
    const wordbookData = collectWordbookData(entry, wordbookIndex);
    const koreanGlosses = (wordbookData.glosses.length > 0 ? wordbookData.glosses : dictData.koreanTerms).slice(
      0,
      8
    );
    const koreanDefinitions = (
      wordbookData.glossText ? [wordbookData.glossText] : dictData.koreanDefinitions
    ).slice(0, 3);
    const searchKeywords = buildSearchKeywords(entry, {
      koreanTerms: koreanGlosses,
      koreanDefinitions
    });

    return {
      id: entry.id,
      word: entry.word,
      forms: entry.forms,
      category: entry.category,
      categoryLabel: entry.categoryLabel,
      categoryDescription: entry.categoryDescription,
      pronunciationIpa: wordbookData.pronunciation,
      koreanGlosses,
      koreanDefinitions,
      englishHints: dictData.englishHints,
      matchedDictionaryForms: dictData.matchedForms,
      searchKeywords
    };
  });

  const stats = words.reduce(
    (acc, word) => {
      acc.total += 1;
      acc[word.category] += 1;
      if (word.matchedDictionaryForms.length === 0) {
        acc.dictUnmatched += 1;
      }
      if (word.koreanGlosses.length === 0) {
        acc.missingGlosses += 1;
      }
      return acc;
    },
    { total: 0, elementary: 0, middle: 0, high: 0, dictUnmatched: 0, missingGlosses: 0 }
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: [
          {
            name: "KICE Word Lister guide",
            file: "kice-word-lister-guide.pdf"
          },
          {
            name: "krdict-reader",
            file: "krdict-reader-master/dict.entries.in"
          },
          {
            name: "Curriculum wordbook",
            file: "curriculum-wordbook.pdf"
          }
        ],
        stats,
        words
      },
      null,
      2
    )
  );

  console.log(`Generated ${stats.total} entries to ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
