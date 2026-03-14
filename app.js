const state = {
  dictionary: null,
  words: [],
  filteredWords: [],
  activeRecognition: null,
  activeFeedbackId: null,
  audioContext: null
};

const CATEGORY_ORDER = ["elementary", "middle", "high"];
const CATEGORY_LABELS = {
  all: "전체 영단어",
  elementary: "초등학교 필수 영단어",
  middle: "중학교 필수 영단어",
  high: "고등학교 필수 영단어"
};

const RESULT_LIMIT = 60;

const refs = {
  input: document.querySelector("#search-input"),
  category: document.querySelector("#category-select"),
  results: document.querySelector("#results"),
  clearButton: document.querySelector("#clear-button"),
  statusText: document.querySelector("#status-text"),
  resultCount: document.querySelector("#result-count"),
  stats: {
    elementary: document.querySelector("#stat-elementary"),
    middle: document.querySelector("#stat-middle"),
    high: document.querySelector("#stat-high")
  },
  banner: document.querySelector("#pronunciation-banner"),
  template: document.querySelector("#result-card-template")
};

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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function levenshtein(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    rows[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    rows[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
    }
  }

  return rows[a.length][b.length];
}

function comparePronunciation(targetForms, transcript) {
  const normalizedTranscript = normalizeEnglish(transcript.replace(/[^\w\s'-]/g, " "));
  const normalizedTargets = targetForms.map((value) => normalizeEnglish(value));

  let bestScore = 0;
  let bestTarget = normalizedTargets[0] ?? "";

  for (const target of normalizedTargets) {
    if (!target) {
      continue;
    }

    const distance = levenshtein(target, normalizedTranscript);
    const score = Math.max(
      0,
      Math.round((1 - distance / Math.max(target.length, normalizedTranscript.length || 1)) * 100)
    );

    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }

  if (bestScore >= 92 || normalizedTargets.includes(normalizedTranscript)) {
    return {
      status: "excellent",
      text: `잘했어요. "${transcript}" 발음이 ${bestTarget}와 매우 가깝습니다.`
    };
  }

  if (bestScore >= 72) {
    return {
      status: "good",
      text: `거의 맞았어요. "${transcript}"로 들렸습니다. 한 번 더 또박또박 말해 보세요.`
    };
  }

  return {
    status: "retry",
    text: `지금은 "${transcript}"로 인식됐습니다. 입 모양과 강세를 조금 더 크게 말해 보세요.`
  };
}

function updateStatus(text) {
  refs.statusText.textContent = text;
}

function updateBanner(text, tone = "default", source = "system") {
  if (!text) {
    refs.banner.hidden = true;
    refs.banner.textContent = "";
    refs.banner.dataset.tone = "";
    refs.banner.dataset.source = "";
    return;
  }

  refs.banner.hidden = false;
  refs.banner.textContent = text;
  refs.banner.dataset.tone = tone;
  refs.banner.dataset.source = source;
}

function clearPronunciationBanner() {
  if (refs.banner.dataset.source === "pronunciation") {
    updateBanner("");
  }
}

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextCtor();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch((error) => {
      console.error(error);
    });
  }

  return state.audioContext;
}

function playCelebrationChime() {
  const audioContext = getAudioContext();

  if (!audioContext) {
    return;
  }

  const notes = [
    { frequency: 523.25, duration: 0.12, delay: 0 },
    { frequency: 659.25, duration: 0.14, delay: 0.08 },
    { frequency: 783.99, duration: 0.18, delay: 0.16 }
  ];

  const now = audioContext.currentTime;

  for (const note of notes) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, now + note.delay);

    gainNode.gain.setValueAtTime(0.0001, now + note.delay);
    gainNode.gain.exponentialRampToValueAtTime(0.14, now + note.delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now + note.delay);
    oscillator.stop(now + note.delay + note.duration + 0.02);
  }
}

function loadDictionary() {
  return fetch("./data/words.json").then((response) => {
    if (!response.ok) {
      throw new Error("사전 데이터를 불러오지 못했습니다.");
    }

    return response.json();
  });
}

function scoreMatch(word, query) {
  if (!query) {
    return 0;
  }

  const englishPool = word.searchKeywords.english.join(" ");
  const koreanPool = word.searchKeywords.korean.join(" ");

  if (englishPool === query || koreanPool === query) {
    return 400;
  }

  if (word.word.toLowerCase() === query) {
    return 350;
  }

  if (word.searchKeywords.english.some((value) => value.startsWith(query))) {
    return 220;
  }

  if (word.searchKeywords.korean.some((value) => value.startsWith(query))) {
    return 200;
  }

  if (englishPool.includes(query)) {
    return 140;
  }

  if (koreanPool.includes(query)) {
    return 130;
  }

  return 0;
}

function filterWords() {
  const rawQuery = refs.input.value.trim();
  const category = refs.category.value;
  const englishQuery = normalizeEnglish(rawQuery);
  const koreanQuery = normalizeKorean(rawQuery);

  let words = state.words;

  if (category !== "all") {
    words = words.filter((word) => word.category === category);
  }

  if (!rawQuery) {
    const ordered = [...words].sort((left, right) => left.id - right.id);
    return ordered.slice(0, RESULT_LIMIT);
  }

  return words
    .map((word) => ({
      word,
      score: Math.max(scoreMatch(word, englishQuery), scoreMatch(word, koreanQuery))
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.word.id - right.word.id)
    .slice(0, RESULT_LIMIT)
    .map((item) => item.word);
}

function renderList(items, rawQuery) {
  refs.results.innerHTML = "";
  refs.resultCount.textContent = `${items.length}개`;

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = rawQuery
      ? `<strong>${escapeHtml(rawQuery)}</strong>에 맞는 단어를 찾지 못했습니다. 철자를 다시 확인하거나 카테고리를 바꿔 보세요.`
      : "검색어를 입력하면 영어와 한국어로 단어를 찾을 수 있습니다.";
    refs.results.append(empty);
    return;
  }

  for (const word of items) {
    const fragment = refs.template.content.cloneNode(true);
    const card = fragment.querySelector(".result-card");
    const title = fragment.querySelector(".word-title");
    const ipa = fragment.querySelector(".word-ipa");
    const forms = fragment.querySelector(".word-forms");
    const badge = fragment.querySelector(".category-badge");
    const glossList = fragment.querySelector(".gloss-list");
    const definitionList = fragment.querySelector(".definition-list");
    const speakButton = fragment.querySelector(".speak-button");
    const checkButton = fragment.querySelector(".check-button");
    const feedback = fragment.querySelector(".feedback-text");

    title.textContent = word.word;
    ipa.textContent = word.pronunciationIpa ? `/${word.pronunciationIpa}/` : "브라우저 음성으로 발음 듣기";
    forms.textContent =
      word.forms.length > 1 ? `같이 찾기: ${word.forms.slice(1).join(", ")}` : word.categoryDescription;
    badge.textContent = word.categoryLabel;

    for (const gloss of word.koreanGlosses.slice(0, 6)) {
      const item = document.createElement("li");
      item.textContent = gloss;
      glossList.append(item);
    }

    for (const definition of word.koreanDefinitions.slice(0, 3)) {
      const item = document.createElement("li");
      item.textContent = definition;
      definitionList.append(item);
    }

    if (word.koreanDefinitions.length === 0) {
      const item = document.createElement("li");
      item.textContent = "간단한 한국어 뜻 위주로 먼저 확인할 수 있습니다.";
      definitionList.append(item);
    }

    speakButton.addEventListener("click", () => {
      speakWord(word, feedback);
    });

    checkButton.addEventListener("click", () => {
      startPronunciationCheck(word, feedback);
    });

    card.dataset.wordId = String(word.id);
    refs.results.append(fragment);
  }
}

function speakWord(word, feedbackNode) {
  if (!("speechSynthesis" in window)) {
    feedbackNode.textContent = "이 브라우저에서는 음성 합성을 지원하지 않습니다.";
    return;
  }

  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.pitch = 1.02;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  feedbackNode.textContent = `"${word.word}" 발음을 들려주고 있습니다.`;
}

function stopRecognition() {
  if (state.activeRecognition) {
    state.activeRecognition.onresult = null;
    state.activeRecognition.onerror = null;
    state.activeRecognition.onend = null;
    try {
      state.activeRecognition.stop();
    } catch (error) {
      console.error(error);
    }
    state.activeRecognition = null;
  }
}

function startPronunciationCheck(word, feedbackNode) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    feedbackNode.textContent = "이 브라우저에서는 말하기 점검을 지원하지 않습니다.";
    return;
  }

  stopRecognition();

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  recognition.continuous = false;

  state.activeRecognition = recognition;
  state.activeFeedbackId = word.id;

  updateBanner(`"${word.word}"를 또박또박 말해 보세요.`, "listening", "pronunciation");
  feedbackNode.textContent = "듣는 중입니다...";

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
    const result = comparePronunciation(word.forms, transcript);
    feedbackNode.textContent = result.text;
    updateBanner(`말하기 점검 완료: ${result.text}`, result.status, "pronunciation");

    if (result.status === "excellent") {
      playCelebrationChime();
    }
  };

  recognition.onerror = (event) => {
    const message =
      event.error === "not-allowed"
        ? "마이크 권한이 필요합니다."
        : event.error === "network"
          ? "음성 인식에 네트워크 연결이 필요할 수 있습니다."
          : "음성 인식을 완료하지 못했습니다.";
    feedbackNode.textContent = message;
    updateBanner(message, "warning", "pronunciation");
  };

  recognition.onend = () => {
    state.activeRecognition = null;
  };

  try {
    recognition.start();
  } catch (error) {
    feedbackNode.textContent = "마이크를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    updateBanner("말하기 점검을 시작하지 못했습니다.", "warning", "pronunciation");
    console.error(error);
  }
}

function render() {
  const rawQuery = refs.input.value.trim();
  state.filteredWords = filterWords();
  renderList(state.filteredWords, rawQuery);

  if (!rawQuery) {
    updateStatus(`데이터가 준비되었습니다. ${CATEGORY_LABELS[refs.category.value]} 기준으로 둘러볼 수 있습니다.`);
    return;
  }

  updateStatus(
    `"${rawQuery}" 검색 결과 ${state.filteredWords.length}개를 표시합니다.`
  );
}

function bindEvents() {
  refs.input.addEventListener("input", () => {
    stopRecognition();
    clearPronunciationBanner();
    render();
  });

  refs.category.addEventListener("change", () => {
    stopRecognition();
    clearPronunciationBanner();
    render();
  });

  refs.clearButton.addEventListener("click", () => {
    refs.input.value = "";
    refs.category.value = "all";
    stopRecognition();
    clearPronunciationBanner();
    render();
    refs.input.focus();
  });

  window.addEventListener("online", () => {
    updateBanner("인터넷이 연결되었습니다. 음성 인식 정확도가 더 좋아질 수 있습니다.", "default");
  });

  window.addEventListener("offline", () => {
    updateBanner("오프라인 상태입니다. 검색과 발음 듣기는 계속 사용할 수 있습니다.", "warning");
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error(error);
  }
}

async function bootstrap() {
  try {
    updateStatus("사전 데이터를 불러오는 중입니다.");
    const dictionary = await loadDictionary();
    state.dictionary = dictionary;
    state.words = dictionary.words;

    refs.stats.elementary.textContent = String(dictionary.stats.elementary);
    refs.stats.middle.textContent = String(dictionary.stats.middle);
    refs.stats.high.textContent = String(dictionary.stats.high);

    bindEvents();
    render();

    if (!navigator.onLine) {
      updateBanner("오프라인 상태입니다. 캐시된 데이터로 검색할 수 있습니다.", "warning");
    }

    registerServiceWorker();
  } catch (error) {
    refs.results.innerHTML =
      '<div class="empty-state">사전 데이터를 준비하지 못했습니다. <code>npm run generate:data</code>를 다시 실행해 주세요.</div>';
    updateStatus(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
  }
}

bootstrap();
