import {
  comparePronunciation,
  getDetailHeading,
  loadDictionaryData,
  normalizeDisplayForm,
  searchWords
} from "./lib/dictionary-logic.js";
import { createPronunciationController } from "./lib/pronunciation-controls.js";
import { createDomRefs } from "./lib/dom-contract.js";
import { createSearchViewState } from "./lib/search-view-state.js";
import { renderLoadFailure } from "./lib/load-recovery.js";
import { renderDataWarning, updateBanner } from "./lib/status-regions.js";
import { trackOfflineReadiness } from "./lib/offline-status.js";
import { createAppStartup } from "./lib/app-startup.js";
import { createLiveAnnouncer } from "./lib/live-announcer.js";

const state = {
  dictionary: null,
  words: [],
  searchResult: null
};

const CATEGORY_ORDER = [
  "elementary",
  "middle",
  "high",
  "elementary-expressions",
  "middle-expressions",
  "supplemental"
];
const CATEGORY_LABELS = {
  all: "전체 단어·표현",
  elementary: "초등학교 필수 영단어",
  middle: "중학교 필수 영단어",
  high: "고등학교 필수 영단어",
  "elementary-expressions": "초등 표현·숙어",
  "middle-expressions": "중학 표현·숙어",
  supplemental: "확장 어휘·표현"
};
const DICTIONARY_FILES = {
  base: { path: "./data/words.json" },
  supplemental: { path: "./data/supplemental-words.json", optional: true },
  textbookExpressions: { path: "./data/textbook-expressions.json", optional: true },
  exampleSentences: { path: "./data/example-sentences.json", optional: true }
};
const MOBILE_COMPACT_MEDIA = "(max-width: 540px)";
const OPTIONAL_DATA_WARNING = "일부 확장 자료를 불러오지 못했지만 기본 영단어 검색은 사용할 수 있습니다.";
const LOAD_FAILURE_MESSAGE = "사전 데이터를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.";
const OFFLINE_STATUS_LABELS = {
  preparing: "오프라인 준비 중",
  ready: "오프라인 사용 준비됨",
  unsupported: "온라인에서 사용 가능",
  failed: "오프라인 준비 실패"
};
const searchViewState = createSearchViewState({ initialLimit: 6, pageSize: 12 });

const refs = createDomRefs();
let eventsBound = false;
let isRetrying = false;
const announceSearchStatus = createLiveAnnouncer({
  onAnnounce: (message) => {
    refs.searchAnnouncer.textContent = message;
  }
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function updateStatus(text) {
  refs.statusText.textContent = text;
  announceSearchStatus(text);
}

function clearPronunciationBanner() {
  if (refs.banner.dataset.source === "pronunciation") {
    updateBanner({ container: refs.banner, text: "" });
  }
}

const pronunciationController = createPronunciationController({
  browserWindow: window,
  comparePronunciation,
  createUtterance: (text) => new SpeechSynthesisUtterance(text),
  updateBanner: (text, tone, source) => updateBanner({ container: refs.banner, text, tone, source }),
  logError: console.error
});

async function fetchDictionaryFile(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`사전 데이터를 불러오지 못했습니다. (${response.status})`);
  }

  return response.json();
}

async function loadDictionary() {
  const optionalErrors = [];
  const dictionary = await loadDictionaryData({
    files: DICTIONARY_FILES,
    loadFile: fetchDictionaryFile,
    onOptionalError: (warning) => optionalErrors.push(warning)
  });

  return { dictionary, optionalErrors };
}

function setSearchControlsDisabled(disabled) {
  for (const control of [refs.input, refs.category, refs.clearButton, refs.loadMoreButton]) {
    control.disabled = disabled;
  }
}

function renderOptionalDataWarning(optionalErrors) {
  renderDataWarning({
    container: refs.dataWarning,
    message: optionalErrors.length > 0 ? OPTIONAL_DATA_WARNING : ""
  });
}

async function retryDictionaryLoad() {
  if (isRetrying) {
    return;
  }

  isRetrying = true;
  setSearchControlsDisabled(true);

  try {
    await bootstrap();
  } finally {
    setSearchControlsDisabled(false);
    isRetrying = false;
  }
}

function prefersCompactResultLayout() {
  return window.matchMedia?.(MOBILE_COMPACT_MEDIA).matches ?? false;
}

function renderList(result, rawQuery) {
  const { items, total, shown, hasMore } = result;

  refs.results.innerHTML = "";
  refs.resultCount.textContent = `총 ${total.toLocaleString("ko-KR")}개 중 ${shown.toLocaleString("ko-KR")}개 표시`;
  refs.loadMoreButton.hidden = !hasMore;
  refs.loadMoreButton.textContent = "결과 12개 더 보기";

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
    const compactLayout = prefersCompactResultLayout();
    const fragment = refs.template.content.cloneNode(true);
    const card = fragment.querySelector(".result-card");
    const title = fragment.querySelector(".word-title");
    const ipa = fragment.querySelector(".word-ipa");
    const forms = fragment.querySelector(".word-forms");
    const badge = fragment.querySelector(".category-badge");
    const glossList = fragment.querySelector(".gloss-list");
    const detailHeading = fragment.querySelector(".detail-heading");
    const definitionList = fragment.querySelector(".definition-list");
    const speakButton = fragment.querySelector(".speak-button");
    const checkButton = fragment.querySelector(".check-button");
    const feedback = fragment.querySelector(".feedback-text");
    const alternativeForms = word.forms.filter(
      (form) => normalizeDisplayForm(form) !== normalizeDisplayForm(word.word)
    );
    const showExampleSentence = Boolean(word.exampleSentence);
    const glossLimit = compactLayout ? 4 : 6;
    const detailItems = showExampleSentence
      ? [word.exampleSentence]
      : word.koreanDefinitions.slice(0, compactLayout ? 2 : 3);

    title.textContent = word.word;
    ipa.textContent = word.pronunciationIpa ? `/${word.pronunciationIpa}/` : "브라우저 음성으로 발음 듣기";
    forms.hidden = alternativeForms.length === 0;
    forms.textContent = alternativeForms.length > 0 ? `같이 찾기: ${alternativeForms.join(", ")}` : "";
    badge.textContent = word.categoryLabel;
    badge.dataset.category = word.category;
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.setAttribute("aria-atomic", "true");
    detailHeading.textContent = getDetailHeading(word);

    for (const gloss of word.koreanGlosses.slice(0, glossLimit)) {
      const item = document.createElement("li");
      item.textContent = gloss;
      glossList.append(item);
    }

    for (const definition of detailItems) {
      const item = document.createElement("li");
      item.textContent = definition;
      definitionList.append(item);
    }

    if (detailItems.length === 0) {
      const item = document.createElement("li");
      item.textContent = "간단한 한국어 뜻 위주로 먼저 확인할 수 있습니다.";
      definitionList.append(item);
    }

    speakButton.addEventListener("click", () => {
      pronunciationController.speakWord(word, feedback);
    });

    checkButton.addEventListener("click", () => {
      pronunciationController.startPronunciationCheck(word, feedback);
    });

    card.dataset.wordId = String(word.id);
    card.tabIndex = -1;
    refs.results.append(fragment);
  }
}

function render() {
  const rawQuery = refs.input.value.trim();
  state.searchResult = searchWords({
    words: state.words,
    rawQuery,
    category: refs.category.value,
    offset: 0,
    limit: searchViewState.limit
  });
  renderList(state.searchResult, rawQuery);
  updateInfoSummary();

  if (!rawQuery) {
    updateStatus(`데이터가 준비되었습니다. ${CATEGORY_LABELS[refs.category.value]} 기준으로 둘러볼 수 있습니다.`);
    return;
  }

  updateStatus(
    `“${rawQuery}” 검색 결과 총 ${state.searchResult.total.toLocaleString("ko-KR")}개 중 ${state.searchResult.shown.toLocaleString("ko-KR")}개를 표시합니다.`
  );
}

function updateInfoSummary() {
  if (!state.dictionary) {
    return;
  }

  if (refs.heroTotalChip) {
    const total =
      (state.dictionary.stats.elementary ?? 0) +
      (state.dictionary.stats.middle ?? 0) +
      (state.dictionary.stats.high ?? 0) +
      (state.dictionary.stats["elementary-expressions"] ?? 0) +
      (state.dictionary.stats["middle-expressions"] ?? 0) +
      (state.dictionary.stats.supplemental ?? 0);
    refs.heroTotalChip.textContent = `${total.toLocaleString("ko-KR")} 단어·표현`;
  }

  if (refs.infoSummaryText) {
    refs.infoSummaryText.textContent = `검색 방식 · 음성 기능 · 결과 ${state.searchResult?.shown ?? 0}개`;
  }
}

function bindEvents() {
  if (eventsBound) {
    return;
  }

  eventsBound = true;
  refs.input.addEventListener("input", () => {
    pronunciationController.stopPronunciationCheck();
    clearPronunciationBanner();
    searchViewState.reset();
    render();
  });

  refs.category.addEventListener("change", () => {
    pronunciationController.stopPronunciationCheck();
    clearPronunciationBanner();
    searchViewState.reset();
    render();
  });

  refs.clearButton.addEventListener("click", () => {
    refs.input.value = "";
    refs.category.value = "all";
    pronunciationController.stopPronunciationCheck();
    clearPronunciationBanner();
    searchViewState.reset();
    render();
    refs.input.focus();
  });

  refs.loadMoreButton.addEventListener("click", () => {
    const previouslyShown = state.searchResult?.shown ?? 0;
    searchViewState.showMore();
    render();

    if (state.searchResult.hasMore) {
      refs.loadMoreButton.focus();
      return;
    }

    refs.results.querySelectorAll(".result-card")[previouslyShown]?.focus();
  });

  window.addEventListener("online", () => {
    updateBanner({
      container: refs.banner,
      text: "인터넷이 연결되었습니다. 음성 인식 정확도가 더 좋아질 수 있습니다.",
      tone: "default",
      source: "network"
    });
  });

  window.addEventListener("offline", () => {
    updateBanner({
      container: refs.banner,
      text: "오프라인 상태입니다. 검색과 발음 듣기는 계속 사용할 수 있습니다.",
      tone: "warning",
      source: "network"
    });
  });

  const compactLayoutMedia = window.matchMedia?.(MOBILE_COMPACT_MEDIA);
  if (compactLayoutMedia) {
    const rerenderForCompactLayout = () => render();
    if (typeof compactLayoutMedia.addEventListener === "function") {
      compactLayoutMedia.addEventListener("change", rerenderForCompactLayout);
    } else if (typeof compactLayoutMedia.addListener === "function") {
      compactLayoutMedia.addListener(rerenderForCompactLayout);
    }
  }
}

function startOfflineReadiness() {
  void trackOfflineReadiness({
    navigatorObject: navigator,
    onStatus: (status) => {
      refs.offlineStatusChip.textContent = OFFLINE_STATUS_LABELS[status];
    }
  });
}

const appStartup = createAppStartup({ startOfflineReadiness, loadDictionary });

async function bootstrap() {
  try {
    updateStatus("사전 데이터를 불러오는 중입니다.");
    const { dictionary, optionalErrors } = await appStartup.loadDictionary();
    state.dictionary = dictionary;
    state.words = dictionary.words;

    for (const category of CATEGORY_ORDER) {
      const statNode = refs.stats[category];
      if (!statNode) {
        continue;
      }
      statNode.textContent = String(dictionary.stats[category] ?? 0);
    }

    bindEvents();
    render();
    renderOptionalDataWarning(optionalErrors);

    if (optionalErrors.length === 0 && !navigator.onLine) {
      updateBanner({
        container: refs.banner,
        text: "오프라인 상태입니다. 캐시된 데이터로 검색할 수 있습니다.",
        tone: "warning",
        source: "network"
      });
    }
  } catch (error) {
    refs.loadMoreButton.hidden = true;
    renderLoadFailure({
      container: refs.results,
      message: LOAD_FAILURE_MESSAGE,
      onRetry: retryDictionaryLoad
    });
    updateStatus(LOAD_FAILURE_MESSAGE);
  }
}

bootstrap();
