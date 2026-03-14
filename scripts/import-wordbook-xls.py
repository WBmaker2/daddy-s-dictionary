from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
BASE_DATA = ROOT / "data" / "words.json"
OUTPUT_FILE = ROOT / "data" / "supplemental-words.json"

CATEGORY = "supplemental"
CATEGORY_LABEL = "확장 어휘·표현"
CATEGORY_DESCRIPTION = "첨부 단어장의 누락 항목을 보강한 구동사·숙어·확장 어휘"

MANUAL_FORMS = {
    "only a few [a little]": ["only a few", "only a little"],
    "quite a few [a little]": ["quite a few", "quite a little"],
    "participate [in]": ["participate in", "participate"],
    "terms.": ["terms"],
    "on good[bad] terms with": ["on good terms with", "on bad terms with"],
    "on[in] on-e's behalf": ["on one's behalf", "in one's behalf"],
    "on[in] behalf of": ["on behalf of", "in behalf of"],
    "of on-e's own": ["of one's own"],
    "[every] now and then": ["every now and then", "now and then"],
    "make a difference [to]": ["make a difference to", "make a difference"],
    "[be] known as": ["be known as", "known as"],
    "just[all] the same": ["just the same", "all the same"],
    "hardly ~ before[when]": ["hardly before", "hardly when"],
    "apply on-self [to] ~": ["apply oneself to", "apply to"],
    "scarcely ~ when[before]": ["scarcely when", "scarcely before"],
    "go on[with ~ / -ing / to+동사원형]": ["go on", "go on with"],
    "imf[international monetary fund]": ["IMF", "International Monetary Fund"],
    "[be] forced to": ["be forced to", "forced to"],
    "[be] fed up with": ["be fed up with", "fed up with"],
    "far from [-ing]": ["far from", "far from -ing"],
    "even though [ = even if ]": ["even though", "even if"],
    "earn[make] on-e's living": ["earn one's living", "make one's living"],
    "[be] conscious of": ["be conscious of", "conscious of"],
    "[be] concerned about": ["be concerned about", "concerned about"],
}

MANUAL_ENTRY_OVERRIDES = {
    "by accident": {
        "koreanGlosses": ["우연히", "뜻하지 않게"],
    },
    "on purpose": {
        "koreanGlosses": ["일부러", "고의로"],
    },
    "only a few [a little]": {
        "koreanGlosses": ["극히 적은", "조금밖에 없는"],
    },
    "quite a few [a little]": {
        "koreanGlosses": ["꽤 많은", "상당수의"],
    },
    "prefer a to b": {
        "koreanGlosses": ["B보다 A를 더 좋아하다", "B보다 A를 더 선호하다"],
    },
    "in order": {
        "koreanGlosses": ["순서대로", "정돈된", "제대로"],
    },
    "according to ~": {
        "word": "according to",
        "speakText": "according to",
        "koreanGlosses": ["~에 따르면", "~에 의하면"],
    },
    "in any case ~": {
        "word": "in any case",
        "speakText": "in any case",
        "koreanGlosses": ["어쨌든", "어떠한 경우에도"],
    },
    "it goes without saying that ~": {
        "word": "It goes without saying that ...",
        "speakText": "It goes without saying that",
        "koreanGlosses": ["~은 말할 필요도 없다", "~은 당연하다"],
    },
    "it takes 시간 to 동사원형": {
        "word": "It takes time to do",
        "forms": ["It takes time to do", "it takes time to", "It takes 시간 to 동사원형"],
        "speakText": "It takes time to do",
        "koreanGlosses": ["~하는 데 시간이 걸리다"],
    },
    "long for + 명사": {
        "word": "long for",
        "forms": ["long for", "long for + noun", "long for + 명사"],
        "speakText": "long for",
        "koreanGlosses": ["~을 간절히 바라다", "~을 갈망하다"],
    },
    "look forward to + 동 대 명사": {
        "word": "look forward to",
        "forms": ["look forward to", "look forward to doing", "look forward to + 동 대 명사"],
        "speakText": "look forward to",
        "koreanGlosses": ["~을 기대하다", "~을 고대하다"],
    },
    "look forward to + 동/대 명사": {
        "word": "look forward to",
        "forms": ["look forward to", "look forward to doing", "look forward to + 동/대 명사"],
        "speakText": "look forward to",
        "koreanGlosses": ["~을 기대하다", "~을 고대하다"],
    },
    "of + 추상명사 --&gt; 형용사": {
        "word": "of + abstract noun",
        "forms": ["of + abstract noun", "of value", "of + 추상명사 --> 형용사"],
        "speakText": "of plus abstract noun",
        "koreanGlosses": ["형용사적 의미를 만드는 표현", "예: of value = valuable"],
    },
    "cannot ~ too": {
        "word": "cannot ... too",
        "speakText": "cannot too",
        "koreanGlosses": ["아무리 ...해도 지나치지 않다"],
    },
    "by all means": {
        "koreanGlosses": ["반드시", "꼭", "물론"],
    },
    "by no means": {
        "koreanGlosses": ["결코 ... 아니다"],
    },
    "[every] now and then": {
        "koreanGlosses": ["때때로", "가끔"],
    },
    "be known to ~": {
        "word": "be known to do",
        "speakText": "be known to do",
        "koreanGlosses": ["~하는 것으로 알려져 있다"],
    },
    "make a difference [to]": {
        "word": "make a difference",
        "speakText": "make a difference",
        "koreanGlosses": ["중요한 차이를 만들다", "영향을 미치다"],
    },
    "take care of": {
        "koreanGlosses": ["돌보다", "처리하다", "신경 쓰다"],
    },
    "make on-eself understood": {
        "word": "make oneself understood",
        "forms": ["make oneself understood", "make on-eself understood"],
        "speakText": "make oneself understood",
        "koreanGlosses": ["자기 뜻을 남에게 알리다", "의사소통하다"],
    },
    "keep up with ~": {
        "word": "keep up with",
        "speakText": "keep up with",
        "koreanGlosses": ["~를 따라가다", "~에 뒤지지 않다"],
    },
    "hear from ~": {
        "word": "hear from",
        "speakText": "hear from",
        "koreanGlosses": ["~에게서 소식을 듣다"],
    },
    "hear of ~": {
        "word": "hear of",
        "speakText": "hear of",
        "koreanGlosses": ["~에 대해 들어 보다", "~의 소식을 듣다"],
    },
    "hear of~": {
        "word": "hear of",
        "forms": ["hear of", "hear of ~", "hear of~"],
        "speakText": "hear of",
        "koreanGlosses": ["~에 대해 들어 보다", "~의 소식을 듣다"],
    },
    "how come ~?": {
        "word": "How come?",
        "forms": ["How come", "How come ~?"],
        "speakText": "How come",
        "koreanGlosses": ["왜 그런가", "어째서인가"],
    },
    "had rather a than b": {
        "koreanGlosses": ["B하느니 차라리 A하겠다"],
    },
    "had better ~": {
        "word": "had better",
        "speakText": "had better",
        "koreanGlosses": ["~하는 것이 낫다"],
    },
    "had better not ~": {
        "word": "had better not",
        "speakText": "had better not",
        "koreanGlosses": ["~하지 않는 것이 낫다"],
    },
    "not ~ at all": {
        "word": "not ... at all",
        "speakText": "not at all",
        "koreanGlosses": ["전혀 ... 아니다", "조금도 ... 아니다"],
    },
    "suffer from ~": {
        "word": "suffer from",
        "speakText": "suffer from",
        "koreanGlosses": ["~으로 고통받다", "~을 앓다"],
    },
    "pay attention to ~": {
        "word": "pay attention to",
        "speakText": "pay attention to",
        "koreanGlosses": ["~에 주의를 기울이다"],
    },
    "prevent ~ from -ing": {
        "word": "prevent A from doing",
        "forms": ["prevent A from doing", "prevent from doing", "prevent ~ from -ing"],
        "speakText": "prevent A from doing",
        "koreanGlosses": ["~가 ...하지 못하게 하다", "~를 막다"],
    },
    "on[in] on-e's behalf": {
        "word": "on one's behalf",
        "forms": ["on one's behalf", "in one's behalf", "on[in] on-e's behalf"],
        "speakText": "on one's behalf",
        "koreanGlosses": ["~을 대신하여", "~을 위해"],
    },
    "on[in] behalf of": {
        "word": "on behalf of",
        "forms": ["on behalf of", "in behalf of", "on[in] behalf of"],
        "speakText": "on behalf of",
        "koreanGlosses": ["~을 대신하여", "~을 위해"],
    },
    "of on-e's own": {
        "word": "of one's own",
        "forms": ["of one's own", "of on-e's own"],
        "speakText": "of one's own",
        "koreanGlosses": ["자기 자신의", "자기만의"],
    },
    "live on ~": {
        "word": "live on",
        "speakText": "live on",
        "koreanGlosses": ["~을 먹고 살다", "~을 주식으로 하다"],
    },
    "make out ~": {
        "word": "make out",
        "speakText": "make out",
        "koreanGlosses": ["이해하다", "알아보다"],
    },
    "anything but ~": {
        "word": "anything but",
        "speakText": "anything but",
        "koreanGlosses": ["결코 ...이 아닌", "...와는 거리가 먼"],
    },
    "too ~ to": {
        "word": "too ... to",
        "speakText": "too something to",
        "koreanGlosses": ["너무 ...해서 ~할 수 없다"],
    },
    "too ~ to ...": {
        "word": "too ... to",
        "forms": ["too ... to", "too ~ to ...", "too ~ to"],
        "speakText": "too something to",
        "koreanGlosses": ["너무 ...해서 ~할 수 없다"],
    },
    "keep on -ing": {
        "word": "keep on doing",
        "forms": ["keep on doing", "keep on -ing"],
        "speakText": "keep on doing",
        "koreanGlosses": ["계속 ...하다"],
    },
    "be used to -ing": {
        "word": "be used to doing",
        "forms": ["be used to doing", "be used to -ing"],
        "speakText": "be used to doing",
        "koreanGlosses": ["...하는 데 익숙하다"],
    },
    "used to ~": {
        "word": "used to do",
        "forms": ["used to do", "used to ~"],
        "speakText": "used to do",
        "koreanGlosses": ["예전에는 ...하곤 했다"],
    },
    "in addition to~": {
        "word": "in addition to",
        "forms": ["in addition to", "in addition to~"],
        "speakText": "in addition to",
        "koreanGlosses": ["~에 더하여", "~뿐 아니라"],
    },
    "as soon as ~": {
        "word": "as soon as",
        "speakText": "as soon as",
        "koreanGlosses": ["~하자마자"],
    },
    "cannot ... without -ing": {
        "word": "cannot ... without doing",
        "forms": ["cannot ... without doing", "cannot ... without -ing"],
        "speakText": "cannot without doing",
        "koreanGlosses": ["...하지 않고는 ~할 수 없다", "...하면 반드시 ~하다"],
    },
    "cannot help -ing": {
        "word": "cannot help doing",
        "forms": ["cannot help doing", "cannot help -ing"],
        "speakText": "cannot help doing",
        "koreanGlosses": ["...하지 않을 수 없다"],
    },
    "both a and b": {
        "koreanGlosses": ["A와 B 둘 다"],
    },
    "either a or b": {
        "koreanGlosses": ["A와 B 중 하나"],
    },
    "neither a nor b": {
        "koreanGlosses": ["A도 B도 아니다"],
    },
    "reply on": {
        "word": "rely on",
        "forms": ["rely on", "reply on"],
        "speakText": "rely on",
        "koreanGlosses": ["~에 의지하다", "~을 믿다"],
    },
    "if on-ly": {
        "word": "if only",
        "forms": ["if only", "if on-ly"],
        "speakText": "if only",
        "koreanGlosses": ["...이면 좋을 텐데", "...하기만 하면"],
    },
    "be + convinced of": {
        "word": "be convinced of",
        "forms": ["be convinced of", "be + convinced of"],
        "speakText": "be convinced of",
        "koreanGlosses": ["~을 확신하다", "~을 굳게 믿다"],
    },
    "have difficulty in -ing": {
        "word": "have difficulty in doing",
        "forms": ["have difficulty in doing", "have difficulty in -ing"],
        "speakText": "have difficulty in doing",
        "koreanGlosses": ["...하는 데 어려움을 겪다"],
    },
}

GENERIC_HEADWORD_OVERRIDES = {
    "ask for ~": "ask for",
    "make it a rule to ~": "make it a rule to do",
    "make fun of ~": "make fun of",
    "make for ~": "make for",
    "too ~ to": "too ... to",
    "keep an eye on ~": "keep an eye on",
    "just now ~": "just now",
    "instead of ~": "instead of",
    "in spite of ~": "in spite of",
    "insist on ~": "insist on",
    "in short ~": "in short",
    "in order to ~": "in order to do",
    "have something to do with ~": "have something to do with",
    "and so on ~": "and so on",
    "have nothing to do with ~": "have nothing to do with",
    "dry up ~": "dry up",
    "do with ~": "do with",
    "do without ~": "do without",
    "do away with ~": "do away with",
}


def normalize_english(value: str) -> str:
    return " ".join(
        str(value)
        .strip()
        .lower()
        .replace("’", "'")
        .replace("`", "'")
        .split()
    )


def normalize_korean(value: str) -> str:
    return " ".join(str(value).strip().split())


def unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if not value:
            continue
        if value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def clean_headword(value: str) -> str:
    cleaned = (
        str(value)
        .strip()
        .replace("’", "'")
        .replace("`", "'")
        .replace("on-eself", "oneself")
        .replace("on-e's", "one's")
        .replace("on-self", "oneself")
        .replace("if on-ly", "if only")
        .replace("reply on", "rely on")
        .replace("terms.", "terms")
    )
    return " ".join(cleaned.split())


def build_forms(raw_word: str) -> list[str]:
    normalized_raw = normalize_english(raw_word)
    if normalized_raw in MANUAL_FORMS:
        return unique([clean_headword(form) for form in MANUAL_FORMS[normalized_raw]])

    cleaned = clean_headword(raw_word)
    variants = [cleaned]

    variants.append(re.sub(r"\[[^\]]+\]", "", cleaned))
    variants.append(re.sub(r"\[([^\]]+)\]", r" \1 ", cleaned))

    sanitized = (
        cleaned.replace("~", " ")
        .replace("…", " ")
        .replace("[", " ")
        .replace("]", " ")
        .replace("(", " ")
        .replace(")", " ")
    )
    variants.append(sanitized)
    variants.append(re.sub(r"-ing\b", "", sanitized))
    variants.append(re.sub(r"\bA\b|\bB\b", "", sanitized))

    collapsed = [" ".join(value.split(" / ")[0].split()) for value in variants]
    collapsed = [value.replace(" / ", " ").replace("/", " ") for value in collapsed]

    return unique(
        [
            value.strip(" ,.;")
            for value in collapsed
            if value.strip(" ,.;")
        ]
    )


def split_glosses(value: str) -> list[str]:
    source = str(value).strip()
    if not source or source.lower() == "nan":
        return []

    without_notes = re.sub(r"\[[^\]]+\]", "", source)
    pieces = []
    for chunk in without_notes.split("|"):
        cleaned = chunk.replace("[", "").replace("]", "").strip().strip(".")
        cleaned = re.sub(r"\s+", " ", cleaned)
        if cleaned:
            pieces.append(cleaned)
    return unique(pieces)


def build_definition(value: str) -> str:
    source = str(value).strip()
    if not source or source.lower() == "nan":
        return ""
    cleaned = source.replace("|", ", ").replace("[", "").replace("]", "")
    return re.sub(r"\s+", " ", cleaned).strip(" ,")


def build_display_word(raw_key: str, forms: list[str]) -> str:
    override = MANUAL_ENTRY_OVERRIDES.get(raw_key, {})
    if override.get("word"):
        return str(override["word"])
    if raw_key in GENERIC_HEADWORD_OVERRIDES:
        return GENERIC_HEADWORD_OVERRIDES[raw_key]
    return forms[0]


def build_speak_text(raw_key: str, display_word: str) -> str:
    override = MANUAL_ENTRY_OVERRIDES.get(raw_key, {})
    if override.get("speakText"):
        return str(override["speakText"])
    if raw_key in GENERIC_HEADWORD_OVERRIDES:
        return (
            GENERIC_HEADWORD_OVERRIDES[raw_key]
            .replace("...", "something")
            .replace(" do", " do")
            .strip()
        )
    return (
        display_word.replace("...", "something")
        .replace("A", "A")
        .replace("B", "B")
        .replace(" + ", " plus ")
        .replace("?", "")
        .strip()
    )


def build_glosses(raw_key: str, raw_meaning: str) -> list[str]:
    override = MANUAL_ENTRY_OVERRIDES.get(raw_key, {})
    if override.get("koreanGlosses"):
        return unique([normalize_korean(value) for value in override["koreanGlosses"]])
    return split_glosses(raw_meaning)


def load_existing_search_terms() -> set[str]:
    payload = json.loads(BASE_DATA.read_text())
    search_terms: set[str] = set()
    for entry in payload["words"]:
        search_terms.add(normalize_english(entry["word"]))
        for form in entry.get("forms", []):
            search_terms.add(normalize_english(form))
        for form in entry.get("searchKeywords", {}).get("english", []):
            search_terms.add(normalize_english(form))
    return search_terms


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import-wordbook-xls.py /path/to/wordbook.xls")

    source_path = Path(sys.argv[1]).expanduser().resolve()
    if not source_path.exists():
        raise SystemExit(f"Missing spreadsheet: {source_path}")

    existing_terms = load_existing_search_terms()
    dataframe = pd.read_excel(source_path)

    records = []
    seen_words: set[str] = set()

    for _, row in dataframe.iterrows():
        raw_word = str(row.get("단어", "")).strip()
        if not raw_word or raw_word.lower() == "nan":
            continue

        raw_key = normalize_english(raw_word)
        forms = build_forms(raw_word)
        override = MANUAL_ENTRY_OVERRIDES.get(raw_key, {})
        if override.get("forms"):
            forms = unique([clean_headword(value) for value in override["forms"]] + forms)
        if not forms:
            continue

        display_word = build_display_word(raw_key, forms)
        forms = unique([display_word] + forms)

        if any(normalize_english(form) in existing_terms for form in forms):
            continue

        key = normalize_english(display_word)
        if key in seen_words:
            continue
        seen_words.add(key)

        glosses = build_glosses(raw_key, row.get("주요뜻", ""))
        definition = ", ".join(glosses) if glosses else build_definition(row.get("주요뜻", ""))
        pronunciation = str(row.get("발음", "")).strip()
        if pronunciation.lower() == "nan":
            pronunciation = ""
        speak_text = build_speak_text(raw_key, display_word)

        english_search = unique([normalize_english(form) for form in forms])
        korean_search = unique([normalize_korean(gloss) for gloss in glosses])
        if definition:
            korean_search.append(normalize_korean(definition))
            korean_search = unique(korean_search)

        records.append(
            {
                "word": display_word,
                "forms": forms,
                "speakText": speak_text,
                "category": CATEGORY,
                "categoryLabel": CATEGORY_LABEL,
                "categoryDescription": CATEGORY_DESCRIPTION,
                "pronunciationIpa": pronunciation,
                "koreanGlosses": glosses[:8],
                "koreanDefinitions": [definition] if definition else [],
                "englishHints": [],
                "matchedDictionaryForms": [],
                "searchKeywords": {
                    "english": english_search,
                    "korean": korean_search,
                },
            }
        )

    base_payload = json.loads(BASE_DATA.read_text())
    start_id = max(entry["id"] for entry in base_payload["words"]) + 1

    words = []
    for index, record in enumerate(records, start=start_id):
        item = dict(record)
        item["id"] = index
        words.append(item)

    output = {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "sources": [
            {
                "name": "User wordbook spreadsheet",
                "file": str(source_path),
            }
        ],
        "stats": {
            "total": len(words),
            CATEGORY: len(words),
        },
        "words": words,
    }

    OUTPUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {len(words)} supplemental entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
