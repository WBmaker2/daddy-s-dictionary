import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_DATA_FILE = path.join(ROOT, "data", "words.json");
const SUPPLEMENTAL_DATA_FILE = path.join(ROOT, "data", "supplemental-words.json");
const OUTPUT_FILE = path.join(ROOT, "data", "textbook-expressions.json");

const CATEGORY_META = {
  "elementary-expressions": {
    label: "초등 표현·숙어",
    description: "초등 영어 교과서에서 반복되는 기본 회화 표현"
  },
  "middle-expressions": {
    label: "중학 표현·숙어",
    description: "중학교 영어 교과서 대화문과 활동에서 자주 쓰이는 표현·숙어"
  }
};

const SOURCE_LIST = [
  {
    name: "바빠 초등 영어 교과서 필수 표현",
    url: "https://m.yes24.com/goods/detail/122496892"
  },
  {
    name: "중1 영어 교과서 대화문 자료",
    url: "https://mi.englishtutortv.com/middle-school-english-1-ybm-song-mira-unit-5-workbook-lesson-2-listening-speaking-11-12-13-14-15-16/"
  },
  {
    name: "중3 영어 교과서 대화문 자료",
    url: "https://mi.englishtutortv.com/middle-school-english-3-daekyo-im-jeonghwa-unit-8-lesson-1-actual-speaking-and-listening-1-2/"
  },
  {
    name: "중학교 영어 수행평가 기능 표현 자료",
    url: "https://www.djschool.net/_common/do.php?a=full&b=12&bidx=449122&aidx=652164"
  }
];

const elementarySeeds = [
  {
    word: "Hello, I'm ...",
    forms: ["Hello, I am ..."],
    koreanGlosses: ["안녕, 나는 ...이야", "처음 만나서 자기소개할 때 쓰는 인사"],
    koreanDefinitions: ["처음 만났을 때 이름이나 자기소개를 시작하는 초등 기본 표현"]
  },
  {
    word: "How are you?",
    koreanGlosses: ["어떻게 지내?", "잘 지내니?"],
    koreanDefinitions: ["상대의 안부를 묻는 대표적인 인사 표현"]
  },
  {
    word: "How old are you?",
    koreanGlosses: ["몇 살이니?"],
    koreanDefinitions: ["나이를 물을 때 쓰는 초등 기본 질문 표현"]
  },
  {
    word: "What's this?",
    forms: ["What is this?"],
    koreanGlosses: ["이것은 무엇이니?"],
    koreanDefinitions: ["사물의 이름을 물을 때 쓰는 표현"]
  },
  {
    word: "What color is this?",
    koreanGlosses: ["이것은 무슨 색이니?"],
    koreanDefinitions: ["색깔을 묻는 초등 기본 질문 표현"]
  },
  {
    word: "How's the weather?",
    forms: ["How is the weather?"],
    koreanGlosses: ["날씨가 어때?"],
    koreanDefinitions: ["날씨 상태를 물을 때 쓰는 표현"]
  },
  {
    word: "What day is it today?",
    koreanGlosses: ["오늘은 무슨 요일이니?"],
    koreanDefinitions: ["요일을 물을 때 쓰는 표현"]
  },
  {
    word: "What time is it now?",
    koreanGlosses: ["지금 몇 시니?"],
    koreanDefinitions: ["시각을 묻는 표현"]
  },
  {
    word: "Stand up, please.",
    koreanGlosses: ["일어나 주세요."],
    koreanDefinitions: ["교실 활동에서 자주 쓰는 간단한 요청 표현"]
  },
  {
    word: "Don't run.",
    forms: ["Do not run."],
    koreanGlosses: ["뛰지 마."],
    koreanDefinitions: ["금지를 말할 때 쓰는 짧은 명령 표현"]
  },
  {
    word: "How many apples?",
    koreanGlosses: ["사과가 몇 개니?"],
    koreanDefinitions: ["개수를 셀 때 쓰는 의문 표현"]
  },
  {
    word: "I can swim.",
    koreanGlosses: ["나는 수영할 수 있어."],
    koreanDefinitions: ["할 수 있는 능력을 말하는 초등 기본 표현"]
  },
  {
    word: "I can't dance.",
    forms: ["I cannot dance."],
    koreanGlosses: ["나는 춤을 출 수 없어."],
    koreanDefinitions: ["할 수 없는 능력을 말하는 표현"]
  },
  {
    word: "I like pizza.",
    koreanGlosses: ["나는 피자를 좋아해."],
    koreanDefinitions: ["좋아하는 것을 말할 때 쓰는 표현"]
  },
  {
    word: "I don't like fishing.",
    forms: ["I do not like fishing."],
    koreanGlosses: ["나는 낚시를 좋아하지 않아."],
    koreanDefinitions: ["싫어하는 것을 말할 때 쓰는 표현"]
  },
  {
    word: "I'm happy.",
    forms: ["I am happy."],
    koreanGlosses: ["나는 기뻐."],
    koreanDefinitions: ["감정 상태를 말하는 기본 표현"]
  },
  {
    word: "Who is she?",
    koreanGlosses: ["그녀는 누구니?"],
    koreanDefinitions: ["사람을 소개하거나 신원을 물을 때 쓰는 표현"]
  },
  {
    word: "What are you doing?",
    koreanGlosses: ["무엇을 하고 있니?"],
    koreanDefinitions: ["현재 하고 있는 행동을 물을 때 쓰는 표현"]
  },
  {
    word: "What do you want?",
    koreanGlosses: ["무엇을 원하니?"],
    koreanDefinitions: ["원하는 것을 물을 때 쓰는 표현"]
  },
  {
    word: "Let's play soccer.",
    forms: ["Let us play soccer."],
    koreanGlosses: ["축구하자."],
    koreanDefinitions: ["함께 무엇을 하자고 제안하는 표현"]
  },
  {
    word: "Where is my watch?",
    koreanGlosses: ["내 시계는 어디 있니?"],
    koreanDefinitions: ["사물의 위치를 묻는 표현"]
  },
  {
    word: "They're on the table.",
    forms: ["They are on the table."],
    koreanGlosses: ["그것들은 탁자 위에 있어."],
    koreanDefinitions: ["사물의 위치를 알려 줄 때 쓰는 표현"]
  },
  {
    word: "How much is it?",
    koreanGlosses: ["이것은 얼마니?"],
    koreanDefinitions: ["가격을 물을 때 쓰는 표현"]
  },
  {
    word: "Is this your bag?",
    koreanGlosses: ["이것은 네 가방이니?"],
    koreanDefinitions: ["물건의 주인을 확인할 때 쓰는 표현"]
  },
  {
    word: "It's not mine.",
    forms: ["It is not mine."],
    koreanGlosses: ["그것은 내 것이 아니야."],
    koreanDefinitions: ["소유를 부정할 때 쓰는 표현"]
  },
  {
    word: "Where are you from?",
    koreanGlosses: ["어디에서 왔니?", "어느 나라 사람이니?"],
    koreanDefinitions: ["출신 지역이나 나라를 물을 때 쓰는 표현"]
  },
  {
    word: "What grade are you in?",
    koreanGlosses: ["몇 학년이니?"],
    koreanDefinitions: ["학년을 물을 때 쓰는 표현"]
  },
  {
    word: "What's your favorite subject?",
    forms: ["What is your favorite subject?"],
    koreanGlosses: ["가장 좋아하는 과목이 무엇이니?"],
    koreanDefinitions: ["선호하는 과목을 물을 때 쓰는 표현"]
  },
  {
    word: "She has long curly hair.",
    koreanGlosses: ["그녀는 길고 곱슬곱슬한 머리를 가졌어."],
    koreanDefinitions: ["사람의 외모를 설명할 때 쓰는 표현"]
  },
  {
    word: "It's in front of the restaurant.",
    forms: ["It is in front of the restaurant."],
    koreanGlosses: ["그것은 식당 앞에 있어."],
    koreanDefinitions: ["장소의 위치를 자세히 설명할 때 쓰는 표현"]
  },
  {
    word: "What do you do in your free time?",
    koreanGlosses: ["자유 시간에 무엇을 하니?"],
    koreanDefinitions: ["취미나 여가 활동을 물을 때 쓰는 표현"]
  },
  {
    word: "What will you do this summer?",
    koreanGlosses: ["이번 여름에 무엇을 할 거니?"],
    koreanDefinitions: ["앞으로의 계획을 물을 때 쓰는 표현"]
  },
  {
    word: "What did you do yesterday?",
    koreanGlosses: ["어제 무엇을 했니?"],
    koreanDefinitions: ["과거에 한 일을 물을 때 쓰는 표현"]
  },
  {
    word: "Why are you happy?",
    koreanGlosses: ["왜 기쁘니?"],
    koreanDefinitions: ["이유를 물을 때 쓰는 표현"]
  },
  {
    word: "Can I take a picture?",
    koreanGlosses: ["사진을 찍어도 될까요?"],
    koreanDefinitions: ["허락을 구할 때 쓰는 공손한 표현"]
  },
  {
    word: "Whose ball is this?",
    koreanGlosses: ["이 공은 누구의 것이니?"],
    koreanDefinitions: ["소유자를 물을 때 쓰는 표현"]
  },
  {
    word: "I have a stomachache.",
    koreanGlosses: ["배가 아파."],
    koreanDefinitions: ["아픈 증상을 말할 때 쓰는 표현"]
  },
  {
    word: "Drink lemon tea.",
    koreanGlosses: ["레몬차를 마셔."],
    koreanDefinitions: ["간단한 조언이나 권유를 할 때 쓰는 표현"]
  },
  {
    word: "It's March 7th.",
    forms: ["It is March 7th."],
    koreanGlosses: ["3월 7일이야."],
    koreanDefinitions: ["날짜를 말할 때 쓰는 표현"]
  },
  {
    word: "I'm going to plant trees.",
    forms: ["I am going to plant trees."],
    koreanGlosses: ["나는 나무를 심을 거야."],
    koreanDefinitions: ["가까운 미래의 계획을 말할 때 쓰는 표현"]
  },
  {
    word: "I'm taller than you.",
    forms: ["I am taller than you."],
    koreanGlosses: ["나는 너보다 키가 더 커."],
    koreanDefinitions: ["비교를 말할 때 쓰는 표현"]
  },
  {
    word: "What would you like?",
    koreanGlosses: ["무엇을 원하니?", "무엇을 드릴까?"],
    koreanDefinitions: ["주문이나 선택을 물을 때 쓰는 표현"]
  },
  {
    word: "How often do you exercise?",
    koreanGlosses: ["얼마나 자주 운동하니?"],
    koreanDefinitions: ["빈도를 물을 때 쓰는 표현"]
  },
  {
    word: "You should wear a helmet.",
    koreanGlosses: ["너는 헬멧을 써야 해."],
    koreanDefinitions: ["조언이나 안전 수칙을 말할 때 쓰는 표현"]
  },
  {
    word: "I want to be a painter.",
    koreanGlosses: ["나는 화가가 되고 싶어."],
    koreanDefinitions: ["장래희망을 말할 때 쓰는 표현"]
  },
  {
    word: "What a nice room!",
    koreanGlosses: ["정말 멋진 방이다!"],
    koreanDefinitions: ["감탄할 때 쓰는 초등 기본 표현"]
  },
  {
    word: "How can I get to the museum?",
    koreanGlosses: ["박물관에 어떻게 가나요?"],
    koreanDefinitions: ["길을 물을 때 쓰는 표현"]
  },
  {
    word: "How about turning off the water?",
    koreanGlosses: ["물을 끄는 건 어때?"],
    koreanDefinitions: ["환경 보호나 제안을 말할 때 쓰는 표현"]
  },
  {
    word: "What time do you get up?",
    koreanGlosses: ["몇 시에 일어나니?"],
    koreanDefinitions: ["일상 습관을 물을 때 쓰는 표현"]
  },
  {
    word: "Do you know anything about hanok?",
    koreanGlosses: ["한옥에 대해 뭐라도 아니?"],
    koreanDefinitions: ["어떤 주제에 대한 지식을 물을 때 쓰는 표현"]
  }
];

const middleSeeds = [
  {
    word: "How often do you ...?",
    koreanGlosses: ["얼마나 자주 ...하니?"],
    koreanDefinitions: ["습관이나 빈도를 묻는 중학 기본 표현"]
  },
  {
    word: "Why don't you ...?",
    koreanGlosses: ["...하는 게 어때?", "...해 보는 건 어때?"],
    koreanDefinitions: ["부드럽게 제안할 때 쓰는 표현"]
  },
  {
    word: "Can I help you?",
    koreanGlosses: ["도와드릴까요?"],
    koreanDefinitions: ["가게나 안내 상황에서 도움을 제안하는 표현"]
  },
  {
    word: "I'd like to ...",
    forms: ["I would like to ..."],
    koreanGlosses: ["...하고 싶어요"],
    koreanDefinitions: ["원하는 것을 공손하게 말하는 표현"]
  },
  {
    word: "Are you a beginner?",
    koreanGlosses: ["당신은 초보자인가요?"],
    koreanDefinitions: ["상대의 수준이나 경험을 물을 때 쓰는 표현"]
  },
  {
    word: "What do you want to read about?",
    koreanGlosses: ["무엇에 대해 읽고 싶니?"],
    koreanDefinitions: ["읽고 싶은 주제를 물을 때 쓰는 표현"]
  },
  {
    word: "I'm curious about ...",
    forms: ["I am curious about ..."],
    koreanGlosses: ["나는 ...이 궁금해."],
    koreanDefinitions: ["궁금한 주제를 말할 때 쓰는 표현"]
  },
  {
    word: "Can you tell me about it?",
    koreanGlosses: ["그것에 대해 말해 줄 수 있니?"],
    koreanDefinitions: ["설명이나 정보를 부탁할 때 쓰는 표현"]
  },
  {
    word: "What kind of book are you looking for?",
    koreanGlosses: ["어떤 종류의 책을 찾고 있니?"],
    koreanDefinitions: ["원하는 종류를 자세히 물을 때 쓰는 표현"]
  },
  {
    word: "I'm looking for ...",
    forms: ["I am looking for ..."],
    koreanGlosses: ["...을 찾고 있어."],
    koreanDefinitions: ["원하는 물건이나 정보를 찾고 있다고 말하는 표현"]
  },
  {
    word: "What are you going to do ...?",
    koreanGlosses: ["...에 무엇을 할 거니?"],
    koreanDefinitions: ["가까운 계획을 물을 때 쓰는 표현"]
  },
  {
    word: "Do you have any plans for ...?",
    koreanGlosses: ["...에 대한 계획이 있니?"],
    koreanDefinitions: ["일정이나 계획 유무를 묻는 표현"]
  },
  {
    word: "I'm looking forward to it.",
    forms: ["I am looking forward to it."],
    koreanGlosses: ["그것을 기대하고 있어."],
    koreanDefinitions: ["기대감을 표현할 때 자주 쓰는 표현"]
  },
  {
    word: "Can I join you?",
    koreanGlosses: ["같이해도 될까?"],
    koreanDefinitions: ["함께 참여해도 되는지 물을 때 쓰는 표현"]
  },
  {
    word: "How about you?",
    koreanGlosses: ["너는 어때?", "당신은 어떤가요?"],
    koreanDefinitions: ["상대의 생각이나 상황을 되묻는 표현"]
  },
  {
    word: "I'd like to buy ...",
    forms: ["I would like to buy ..."],
    koreanGlosses: ["...을 사고 싶어요."],
    koreanDefinitions: ["물건을 사려고 할 때 공손하게 말하는 표현"]
  },
  {
    word: "That's a good idea.",
    forms: ["That is a good idea."],
    koreanGlosses: ["좋은 생각이야."],
    koreanDefinitions: ["상대의 제안에 동의할 때 쓰는 표현"]
  },
  {
    word: "I'm going to have ...",
    forms: ["I am going to have ..."],
    koreanGlosses: ["...을 먹을 거예요", "...을 가질 거예요"],
    koreanDefinitions: ["선택한 음식이나 계획을 말할 때 쓰는 표현"]
  },
  {
    word: "What would you like to read?",
    koreanGlosses: ["무엇을 읽고 싶니?"],
    koreanDefinitions: ["원하는 읽기 자료를 물을 때 쓰는 표현"]
  },
  {
    word: "I'm interested in ...",
    forms: ["I am interested in ..."],
    koreanGlosses: ["나는 ...에 관심이 있어."],
    koreanDefinitions: ["관심 있는 분야를 말하는 표현"]
  },
  {
    word: "What do you think?",
    koreanGlosses: ["어떻게 생각하니?"],
    koreanDefinitions: ["의견을 물을 때 가장 자주 쓰이는 표현"]
  },
  {
    word: "I agree.",
    koreanGlosses: ["동의해."],
    koreanDefinitions: ["상대 의견에 찬성할 때 쓰는 표현"]
  },
  {
    word: "What do you mean?",
    koreanGlosses: ["무슨 뜻이니?"],
    koreanDefinitions: ["상대의 말을 다시 확인할 때 쓰는 표현"]
  },
  {
    word: "You should believe in yourself.",
    koreanGlosses: ["너 자신을 믿어야 해."],
    koreanDefinitions: ["격려나 조언을 할 때 쓰는 표현"]
  },
  {
    word: "Can I borrow it?",
    koreanGlosses: ["그것을 빌려도 될까?"],
    koreanDefinitions: ["물건을 빌려도 되는지 물을 때 쓰는 표현"]
  },
  {
    word: "Could you explain how it works?",
    koreanGlosses: ["어떻게 작동하는지 설명해 줄래?"],
    koreanDefinitions: ["사용법이나 원리를 묻는 공손한 표현"]
  },
  {
    word: "It is likely that ...",
    koreanGlosses: ["...일 가능성이 크다."],
    koreanDefinitions: ["가능성을 설명할 때 쓰는 표현"]
  },
  {
    word: "I'd like to exchange ...",
    forms: ["I would like to exchange ..."],
    koreanGlosses: ["...을 교환하고 싶어요."],
    koreanDefinitions: ["물건을 교환하고 싶을 때 쓰는 표현"]
  },
  {
    word: "I'd like to get a refund ...",
    forms: ["I would like to get a refund ..."],
    koreanGlosses: ["환불받고 싶어요."],
    koreanDefinitions: ["환불을 요청할 때 쓰는 표현"]
  },
  {
    word: "I suggest you ...",
    koreanGlosses: ["나는 네가 ...하길 제안해."],
    koreanDefinitions: ["조심스럽게 조언이나 제안을 할 때 쓰는 표현"]
  },
  {
    word: "for sure",
    koreanGlosses: ["확실히", "물론"],
    koreanDefinitions: ["강한 확신이나 동의를 나타내는 짧은 표현"]
  },
  {
    word: "go with ...",
    koreanGlosses: ["...와 잘 어울리다", "...와 함께 가다"],
    koreanDefinitions: ["옷이나 사물이 잘 어울린다고 말할 때 자주 쓰는 표현"]
  }
];

const CONTRACTION_RULES = [
  [/\bI'm\b/gi, "I am"],
  [/\bI'd\b/gi, "I would"],
  [/\bWhat's\b/gi, "What is"],
  [/\bHow's\b/gi, "How is"],
  [/\bIt's\b/gi, "It is"],
  [/\bThey're\b/gi, "They are"],
  [/\bDon't\b/gi, "Do not"],
  [/\bcan't\b/gi, "cannot"],
  [/\bLet's\b/gi, "Let us"],
  [/\bThat's\b/gi, "That is"]
];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeEnglish(value) {
  return String(value)
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKorean(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  const ordered = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const trimmed = String(value).trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    ordered.push(trimmed);
  }

  return ordered;
}

function expandContractions(value) {
  let expanded = value;

  for (const [pattern, replacement] of CONTRACTION_RULES) {
    expanded = expanded.replace(pattern, replacement);
  }

  return expanded;
}

function stripPunctuation(value) {
  return value.replace(/[?!.,]/g, "").replace(/\s+/g, " ").trim();
}

function buildForms(word, extraForms = []) {
  const expanded = expandContractions(word);

  return unique([word, stripPunctuation(word), expanded, stripPunctuation(expanded), ...extraForms]);
}

function buildSpeakText(word) {
  return stripPunctuation(word.replace(/\.\.\./g, " "));
}

function buildSearchKeywords(forms, speakText, koreanGlosses, koreanDefinitions) {
  return {
    english: unique([...forms, speakText]).map(normalizeEnglish),
    korean: unique([...koreanGlosses, ...koreanDefinitions]).map(normalizeKorean)
  };
}

function collectExistingTerms() {
  const sources = [loadJson(BASE_DATA_FILE)];

  if (fs.existsSync(SUPPLEMENTAL_DATA_FILE)) {
    sources.push(loadJson(SUPPLEMENTAL_DATA_FILE));
  }

  const searchTerms = new Set();
  let lastId = 0;

  for (const payload of sources) {
    for (const entry of payload.words) {
      lastId = Math.max(lastId, Number(entry.id) || 0);
      searchTerms.add(normalizeEnglish(entry.word));

      for (const form of entry.forms || []) {
        searchTerms.add(normalizeEnglish(form));
      }

      for (const keyword of entry.searchKeywords?.english || []) {
        searchTerms.add(normalizeEnglish(keyword));
      }
    }
  }

  return { searchTerms, lastId };
}

function buildEntries(seedEntries, category, startId, existingTerms) {
  const meta = CATEGORY_META[category];
  const words = [];
  let nextId = startId;

  for (const seed of seedEntries) {
    const forms = buildForms(seed.word, seed.forms ?? []);
    const wordKey = normalizeEnglish(seed.word);
    const duplicate =
      existingTerms.has(wordKey) || forms.some((form) => existingTerms.has(normalizeEnglish(form)));

    if (duplicate) {
      continue;
    }

    const speakText = seed.speakText ?? buildSpeakText(seed.word);
    const searchKeywords = buildSearchKeywords(
      forms,
      speakText,
      seed.koreanGlosses ?? [],
      seed.koreanDefinitions ?? []
    );

    words.push({
      id: nextId,
      word: seed.word,
      forms,
      speakText,
      category,
      categoryLabel: meta.label,
      categoryDescription: meta.description,
      pronunciationIpa: "",
      koreanGlosses: seed.koreanGlosses ?? [],
      koreanDefinitions: seed.koreanDefinitions ?? [],
      englishHints: [],
      matchedDictionaryForms: [],
      searchKeywords
    });

    existingTerms.add(wordKey);
    for (const form of forms) {
      existingTerms.add(normalizeEnglish(form));
    }
    nextId += 1;
  }

  return { words, nextId };
}

function main() {
  const { searchTerms, lastId } = collectExistingTerms();
  const elementaryResult = buildEntries(
    elementarySeeds,
    "elementary-expressions",
    lastId + 1,
    searchTerms
  );
  const middleResult = buildEntries(
    middleSeeds,
    "middle-expressions",
    elementaryResult.nextId,
    searchTerms
  );
  const words = [...elementaryResult.words, ...middleResult.words];

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: SOURCE_LIST,
    stats: {
      total: words.length,
      "elementary-expressions": elementaryResult.words.length,
      "middle-expressions": middleResult.words.length
    },
    words
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT_FILE), stats: payload.stats }, null, 2));
}

main();
