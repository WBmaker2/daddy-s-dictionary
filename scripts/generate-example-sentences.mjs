import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";

const ROOT = process.cwd();
const WORDBOOK_PDF = path.join(ROOT, "curriculum-wordbook.pdf");
const BASE_DATA_FILE = path.join(ROOT, "data", "words.json");
const SUPPLEMENTAL_DATA_FILE = path.join(ROOT, "data", "supplemental-words.json");
const OUTPUT_FILE = path.join(ROOT, "data", "example-sentences.json");

const COMMON_ADVERBS = new Set([
  "again",
  "almost",
  "already",
  "also",
  "always",
  "away",
  "back",
  "else",
  "even",
  "far",
  "here",
  "just",
  "later",
  "maybe",
  "never",
  "now",
  "often",
  "perhaps",
  "quickly",
  "quite",
  "rarely",
  "seldom",
  "so",
  "sometimes",
  "soon",
  "then",
  "there",
  "today",
  "tomorrow",
  "together",
  "too",
  "very",
  "well",
  "yet"
]);

const FUNCTION_WORD_EXAMPLES = {
  a: "I saw a bird in the tree.",
  about: "We talked about the trip after lunch.",
  above: "The picture hangs above my desk.",
  abroad: "My uncle lives abroad now.",
  after: "We play soccer after school.",
  again: "Please read the sentence again.",
  all: "All the students clapped together.",
  almost: "I was almost late for class.",
  along: "We walked along the river.",
  already: "I already finished my homework.",
  also: "She also likes science.",
  always: "He always brushes his teeth at night.",
  among: "The cat hid among the boxes.",
  and: "I bought apples and milk.",
  another: "Can I have another pencil?",
  any: "Do you have any questions?",
  around: "We sat around the table.",
  as: "She works as a teacher.",
  at: "We meet at the library.",
  away: "The bird flew away quickly.",
  because: "I stayed inside because it was raining.",
  before: "Wash your hands before dinner.",
  behind: "My bag is behind the chair.",
  below: "The answer is below the picture.",
  beside: "He sat beside his best friend.",
  between: "The bank is between the store and the cafe.",
  both: "Both teams played very well.",
  but: "I wanted to go, but I was sick.",
  by: "We went there by bus.",
  can: "I can swim across the pool.",
  could: "Could you open the window?",
  each: "Each student got a new notebook.",
  either: "You can choose either book.",
  enough: "We have enough time to finish.",
  every: "I walk to school every morning.",
  few: "Few students knew the answer.",
  for: "This gift is for my sister.",
  from: "This letter is from my cousin.",
  if: "If it rains, we will stay home.",
  in: "My keys are in the drawer.",
  into: "She walked into the room quietly.",
  it: "It is warm today.",
  its: "The dog wagged its tail.",
  many: "Many people visited the museum.",
  may: "You may sit here.",
  more: "I need more time to study.",
  most: "Most students joined the event.",
  much: "We do not have much sugar left.",
  must: "You must wear a seat belt.",
  near: "Our school is near the park.",
  neither: "Neither answer was correct.",
  never: "I never skip breakfast.",
  of: "The roof of the house is blue.",
  off: "Please turn off the light.",
  on: "The book is on the desk.",
  once: "I visited Jeju once last year.",
  only: "Only one bus stops here.",
  or: "Would you like tea or juice?",
  other: "The other shoe is under the bed.",
  out: "Please take the trash out.",
  over: "A plane flew over the city.",
  perhaps: "Perhaps we can meet tomorrow.",
  quite: "The movie was quite funny.",
  rather: "I would rather stay home tonight.",
  so: "I was tired, so I went to bed early.",
  some: "Some students stayed after class.",
  than: "My brother is taller than me.",
  that: "That book is very interesting.",
  the: "The sun is bright today.",
  their: "Their classroom is on the second floor.",
  them: "I saw them at the bus stop.",
  then: "Finish your work, and then take a break.",
  there: "There is a small shop near my home.",
  these: "These cookies smell great.",
  they: "They are waiting at the gate.",
  this: "This pencil is mine.",
  those: "Those mountains look beautiful.",
  through: "The train passed through the tunnel.",
  to: "We walked to the station together.",
  too: "The box is too heavy for me.",
  under: "The cat is sleeping under the table.",
  until: "We studied until midnight.",
  up: "She looked up at the sky.",
  very: "The soup is very hot.",
  we: "We cleaned the room together.",
  when: "Call me when you get home.",
  where: "Where did you put my hat?",
  while: "I listened to music while I cleaned.",
  who: "Who is your homeroom teacher?",
  whose: "Whose umbrella is this?",
  with: "I went to the museum with my family.",
  without: "He left without his phone.",
  would: "I would like some water.",
  yet: "I have not finished the book yet."
};

const POS_HEADER = /^(n|pron|adj|v|adv|prep|conj|int|det|num|aux|art)(?:,\s*(n|pron|adj|v|adv|prep|conj|int|det|num|aux|art))*\s+/i;
const SIMPLE_WORD = /^[A-Za-z-]+$/;
const POS_OVERRIDES = {
  ago: "function",
  ahead: "adv",
  alone: "adj",
  alright: "adj"
};

function normalizeEnglish(value) {
  return String(value)
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseWordbookEntries(text) {
  const cleanedText = text.replace(/\r/g, "");
  const regex =
    /^([A-Za-z][A-Za-z0-9 ./'-]*?)\s+\[([^\]]+)\]\s*:\s*([\s\S]*?)(?=^[A-Za-z][A-Za-z0-9 ./'-]*?\s+\[[^\]]+\]\s*:|\Z)/gm;
  const index = new Map();

  for (const match of cleanedText.matchAll(regex)) {
    const word = match[1].trim();
    const body = match[3].replace(/\s+/g, " ").trim();
    const glossChunk = body.split("•")[0].trim();
    const headerMatch = glossChunk.match(POS_HEADER);
    const posList = headerMatch ? headerMatch[0].trim().split(/\s*,\s*|\s+/).filter(Boolean) : [];
    const glossText = headerMatch ? glossChunk.slice(headerMatch[0].length).trim() : glossChunk;

    index.set(normalizeEnglish(word), {
      posList,
      glossText
    });
  }

  return index;
}

function isExpressionEntry(entry) {
  return (
    entry.category.endsWith("expressions") ||
    !SIMPLE_WORD.test(entry.word)
  );
}

function isAdjectiveGloss(gloss) {
  return /(한|적인|로운|스러운|있는|없는|같은|다운)$/.test(gloss);
}

function isVerbGloss(gloss) {
  return /다$/.test(gloss) && !isAdjectiveGloss(gloss);
}

function isPrepositionGloss(gloss) {
  return /^~/.test(gloss) || /(에|에서|으로|보다|처럼|동안|까지|부터)$/.test(gloss);
}

function isAdverbGloss(gloss, word) {
  return COMMON_ADVERBS.has(normalizeEnglish(word)) || /(게|히|도록|쯤)$/.test(gloss);
}

function inferPos(entry, wordbookIndex) {
  const info = wordbookIndex.get(normalizeEnglish(entry.word));
  const firstGloss = entry.koreanGlosses?.[0] ?? "";
  const posList = info?.posList ?? [];
  const normalizedWord = normalizeEnglish(entry.word);

  if (POS_OVERRIDES[normalizedWord]) {
    return POS_OVERRIDES[normalizedWord];
  }

  if (FUNCTION_WORD_EXAMPLES[normalizedWord]) {
    return "function";
  }

  if (isAdjectiveGloss(firstGloss)) {
    return "adj";
  }
  if (isAdverbGloss(firstGloss, entry.word)) {
    return "adv";
  }
  if (isPrepositionGloss(firstGloss)) {
    return "function";
  }
  if (isVerbGloss(firstGloss)) {
    return "v";
  }

  if (posList.includes("n") && posList.length === 1) {
    return "n";
  }
  if (posList.includes("adj") && posList.length === 1) {
    return "adj";
  }
  if (posList.includes("adv") && posList.length === 1) {
    return "adv";
  }
  if (posList.includes("v") && posList.length === 1) {
    return "v";
  }
  if (posList.some((pos) => ["prep", "conj", "pron", "det", "num", "aux", "art", "int"].includes(pos))) {
    return "function";
  }

  return "n";
}

function likelyIntransitive(entry) {
  const firstGloss = entry.koreanGlosses?.[0] ?? "";
  return /(가다|오다|떠나다|도착하다|존재하다|변하다|흐르다|자라다|살다|웃다|울다|앉다|서다|멈추다|일어나다)/.test(
    firstGloss
  );
}

function isStateLikeVerb(entry) {
  const firstGloss = entry.koreanGlosses?.[0] ?? "";
  return /(많다|풍부하다|없다|있다|같다|늘다|줄다|남다)/.test(firstGloss);
}

function pickLevel(category) {
  if (category === "elementary") {
    return "elementary";
  }
  if (category === "middle") {
    return "middle";
  }
  return "high";
}

function firstGloss(entry) {
  return entry.koreanGlosses?.[0] ?? "";
}

function chooseArticle(word) {
  const normalized = normalizeEnglish(word);
  return /^(a|e|i|o|u)/.test(normalized) && !/^(one|uni|use|user|euro)/.test(normalized) ? "an" : "a";
}

function isAbstractNounGloss(gloss) {
  return /(주의|관심|합의|방법|접근법|방식|원인|요인|이유|기회|문제|결과|영향|효과|정보|계획|관계|변화|상태|가치|역할|소식|사실|과정|의견|질문|대답|경험|규칙|실수|목표|부분|분야|이익|손해|차이|위험|균형|주제|증거|자료|연구|지식|접속|접근|입장|공기|농업|생물학|미술|아름다움|습득|남용|원조|지원|의제|전진|발전|진전|모험|조언|나이|산$)/.test(
    gloss
  );
}

function buildNounSentence(entry, level) {
  const { word } = entry;
  const gloss = firstGloss(entry);

  if (/주소/.test(gloss)) {
    return `Please write your ${word} on the form.`;
  }
  if (/사고|사건/.test(gloss)) {
    return `The ${word} happened near the station yesterday.`;
  }
  if (/지역|구역|장소/.test(gloss)) {
    return `The ${word} is quiet in the morning.`;
  }
  if (/학교|학원|교실/.test(gloss)) {
    return `The ${word} opens early every weekday.`;
  }
  if (/성인|어른|사람|학생|교사|선수|주인|환자|승객|관광객|회원|아이|아기|친구|부모|가수|배우|작가|직원|지도자|대리인/.test(gloss)) {
    return `The ${word} helped the child cross the street.`;
  }
  if (/청소년|중독자|건축가|대사|대표|교수|의사|간호사|경찰관|기자|연구자|예술가/.test(gloss)) {
    return `The ${word} spoke kindly to the students.`;
  }
  if (/오후/.test(gloss)) {
    return `I will call you in the ${word}.`;
  }
  if (/가을/.test(gloss)) {
    return `Leaves turn red in ${word}.`;
  }
  if (/나이/.test(gloss)) {
    return `${word[0].toUpperCase()}${word.slice(1)} is only one part of who you are.`;
  }
  if (/공기/.test(gloss)) {
    return `Fresh ${word} came in through the window.`;
  }
  if (/미술/.test(gloss)) {
    return `${word[0].toUpperCase()}${word.slice(1)} helps people share ideas.`;
  }
  if (/아름다움/.test(gloss)) {
    return `The ${word} of the sky made us stop.`;
  }
  if (/남용/.test(gloss)) {
    return `The ${word} of plastic causes many problems.`;
  }
  if (/습득/.test(gloss)) {
    return `${word[0].toUpperCase()}${word.slice(1)} takes time and practice.`;
  }
  if (/전진|발전|진전/.test(gloss)) {
    return `Science made a big ${word} this year.`;
  }
  if (/유리한 점|장점/.test(gloss)) {
    return `This method has a clear ${word}.`;
  }
  if (/모험/.test(gloss)) {
    return `The trip felt like a real ${word}.`;
  }
  if (/조언/.test(gloss)) {
    return `Her ${word} helped me a lot.`;
  }
  if (/원조|지원|도움/.test(gloss)) {
    return `The extra ${word} helped the village.`;
  }
  if (/의제/.test(gloss)) {
    return `The ${word} was shared before the meeting.`;
  }
  if (/항공사/.test(gloss)) {
    return `The ${word} added a new route this year.`;
  }
  if (/비행기/.test(gloss)) {
    return `The ${word} flew over our school.`;
  }
  if (/행동/.test(gloss)) {
    return `His ${word} of kindness made us smile.`;
  }
  if (/말씨|억양|발음/.test(gloss)) {
    return `Her ${word} was warm and clear.`;
  }
  if (/계좌/.test(gloss)) {
    return `I checked my ${word} online today.`;
  }
  if (/합의/.test(gloss)) {
    return `The two sides reached ${chooseArticle(word)} ${word} at last.`;
  }
  if (/주의|관심/.test(gloss)) {
    return `Please pay ${word} to the next question.`;
  }
  if (/방법|접근법|방식/.test(gloss)) {
    return `This ${word} works well for beginners.`;
  }
  if (/원인|요인|이유/.test(gloss)) {
    return `Cost is an important ${word} in this choice.`;
  }
  if (/기회/.test(gloss)) {
    return `It was a good ${word} to learn something new.`;
  }
  if (/문제/.test(gloss)) {
    return `The ${word} was harder than I expected.`;
  }
  if (/결과/.test(gloss)) {
    return `The ${word} was better than we expected.`;
  }
  if (/영향|효과/.test(gloss)) {
    return `The ${word} was clear to everyone.`;
  }
  if (/부분|분야/.test(gloss)) {
    return `This ${word} of the lesson is important.`;
  }
  if (/입장|접속|접근/.test(gloss)) {
    return `Students need easy ${word} to good information.`;
  }

  if (isAbstractNounGloss(gloss)) {
    return `We talked about ${word} in class today.`;
  }

  return `I saw the ${word} in a picture today.`;
}

function buildVerbSentence(entry, level) {
  const { word } = entry;
  const gloss = firstGloss(entry);

  if (/버리다|포기하다/.test(gloss)) {
    return `Do not ${word} your goal too easily.`;
  }
  if (/중단하다|취소하다/.test(gloss)) {
    return `They had to ${word} the plan because of rain.`;
  }
  if (/받아들이다|수락하다/.test(gloss)) {
    return `She decided to ${word} the offer.`;
  }
  if (/흡수하다/.test(gloss)) {
    return `Plants ${word} water through their roots.`;
  }
  if (/가속화하다/.test(gloss)) {
    return `New tools can ${word} the work.`;
  }
  if (/공간을 제공하다|수용하다/.test(gloss)) {
    return `This room can ${word} thirty guests.`;
  }
  if (/동반하다|함께 가다/.test(gloss)) {
    return `Parents often ${word} their children to the clinic.`;
  }
  if (/완수하다|달성하다|이루다/.test(gloss)) {
    return `She worked hard to ${word} her goal.`;
  }
  if (/고발하다/.test(gloss)) {
    return `They decided to ${word} the company for fraud.`;
  }
  if (/인정하다/.test(gloss)) {
    return `He did not want to ${word} his mistake.`;
  }
  if (/습득하다|획득하다|얻다/.test(gloss)) {
    return `Students ${word} new skills through practice.`;
  }
  if (/첨가하다|더하다/.test(gloss)) {
    return `Please ${word} some sugar to the tea.`;
  }
  if (/조정하다/.test(gloss)) {
    return `We need to ${word} the schedule for everyone.`;
  }
  if (/관리하다/.test(gloss)) {
    return `She learned to ${word} her time well.`;
  }
  if (/존경하다/.test(gloss)) {
    return `Many students ${word} the coach.`;
  }
  if (/채택하다/.test(gloss)) {
    return `The school will ${word} a new rule next year.`;
  }
  if (/조언하다|충고하다/.test(gloss)) {
    return `Teachers ${word} students to read every day.`;
  }
  if (/광고하다/.test(gloss)) {
    return `They ${word} the festival online.`;
  }
  if (/여유가 되다/.test(gloss)) {
    return `We cannot ${word} a new car now.`;
  }
  if (/허락하다/.test(gloss)) {
    return `My parents ${word} me to stay out longer.`;
  }
  if (/놀라게 하다/.test(gloss)) {
    return `The news will ${word} your friends.`;
  }
  if (/즐겁게 하다/.test(gloss)) {
    return `Funny games ${word} the children.`;
  }
  if (/발표하다/.test(gloss)) {
    return `They will ${word} the winner tomorrow.`;
  }
  if (/짜증나게 하다/.test(gloss)) {
    return `Loud noises ${word} me during study time.`;
  }
  if (/신청하다/.test(gloss)) {
    return `I will ${word} for the program next week.`;
  }
  if (/임명하다/.test(gloss)) {
    return `They will ${word} a new leader soon.`;
  }
  if (/체포하다/.test(gloss)) {
    return `The police ${word} the thief near the station.`;
  }
  if (/재다|평가하다/.test(gloss)) {
    return `Teachers ${word} progress in many ways.`;
  }
  if (/맡기다/.test(gloss)) {
    return `The teacher will ${word} each team a task.`;
  }
  if (/추정하다/.test(gloss)) {
    return `Many people ${word} that the train was delayed.`;
  }
  if (/붙이다/.test(gloss)) {
    return `Please ${word} the note to the wall.`;
  }
  if (/공격하다/.test(gloss)) {
    return `The dog did not ${word} anyone.`;
  }
  if (/시도하다/.test(gloss)) {
    return `We will ${word} a new method today.`;
  }
  if (/마음을 끌다/.test(gloss)) {
    return `Bright colors ${word} young readers.`;
  }
  if (/속하다/.test(gloss)) {
    return `This book does not ${word} to me.`;
  }
  if (/굽히다/.test(gloss)) {
    return `Please ${word} your knees slowly.`;
  }
  if (/돈을 걸다/.test(gloss)) {
    return `Do not ${word} money on that game.`;
  }
  if (/묶다/.test(gloss)) {
    return `Please ${word} the boxes with string.`;
  }
  if (/물다/.test(gloss)) {
    return `The dog may ${word} if it feels scared.`;
  }
  if (/지루하게 하다/.test(gloss)) {
    return `The long speech did not ${word} us.`;
  }
  if (/괴롭히다/.test(gloss)) {
    return `Do not ${word} your little brother.`;
  }
  if (/지지하다/.test(gloss)) {
    return `Many people ${word} the idea.`;
  }
  if (/동의하다/.test(gloss)) {
    return `I ${word} with your idea.`;
  }
  if (/영향을 미치다/.test(gloss)) {
    return `Lack of sleep can ${word} your mood.`;
  }
  if (/다가가다|접근하다/.test(gloss)) {
    return `Do not ${word} the edge of the roof.`;
  }
  if (/입장하다|접속하다/.test(gloss)) {
    return `Students can ${word} the website from home.`;
  }
  if (/언쟁을 하다|논쟁하다/.test(gloss)) {
    return `They often ${word} about small things.`;
  }
  if (/주장하다/.test(gloss)) {
    return `Some people ${word} that practice matters most.`;
  }
  if (/마련하다|정리하다|배열하다/.test(gloss)) {
    return `We need to ${word} the chairs before class.`;
  }
  if (/참석하다/.test(gloss)) {
    return `Many parents ${word} the meeting every year.`;
  }
  if (/피하다|막다/.test(gloss)) {
    return `Try to ${word} loud places when you study.`;
  }
  if (/적응하다/.test(gloss)) {
    return `Animals can ${word} to new environments.`;
  }
  if (/맞추다/.test(gloss)) {
    return `We need to ${word} the plan to our budget.`;
  }
  if (/아프다/.test(gloss)) {
    return `My legs ${word} after a long hike.`;
  }
  if (/모으다|축적하다/.test(gloss)) {
    return `Dust can ${word} under the bed.`;
  }
  if (/도착하다/.test(gloss)) {
    return `The train will ${word} in ten minutes.`;
  }
  if (/떠나다/.test(gloss)) {
    return `We will ${word} early in the morning.`;
  }
  if (/가다/.test(gloss)) {
    return `We can ${word} there by bus.`;
  }
  if (/오다/.test(gloss)) {
    return `Spring will ${word} soon.`;
  }
  if (/변하다/.test(gloss)) {
    return `Things can ${word} very quickly.`;
  }
  if (/흐르다/.test(gloss)) {
    return `The river will ${word} past the town.`;
  }
  if (/자라다/.test(gloss)) {
    return `Children ${word} quickly in middle school.`;
  }
  if (/존재하다|있다/.test(gloss)) {
    return `Such problems still ${word} today.`;
  }
  if (/말하다|설명하다|알리다/.test(gloss)) {
    return `Please ${word} the rule again.`;
  }
  if (/물어보다/.test(gloss)) {
    return `I want to ${word} one question.`;
  }
  if (/초대하다/.test(gloss)) {
    return `She will ${word} her friends to the party.`;
  }
  if (/보여주다|증명하다/.test(gloss)) {
    return `The chart can ${word} the change clearly.`;
  }
  if (/돕다/.test(gloss)) {
    return `Good notes can ${word} you study better.`;
  }
  if (/사용하다/.test(gloss)) {
    return `We ${word} this app every day.`;
  }
  if (/만들다|창조하다/.test(gloss)) {
    return `They ${word} a poster for the festival.`;
  }
  if (/읽다/.test(gloss)) {
    return `Please ${word} the next sentence aloud.`;
  }
  if (/쓰다/.test(gloss)) {
    return `Please ${word} your name here.`;
  }
  if (/보다/.test(gloss)) {
    return `We can ${word} the stars at night.`;
  }
  if (/듣다/.test(gloss)) {
    return `Please ${word} carefully to the announcement.`;
  }

  if (likelyIntransitive(entry)) {
    if (level === "elementary") {
      return `Things can ${word} quickly.`;
    }
    if (level === "middle") {
      return `Many changes can ${word} over time.`;
    }
    return `Some situations can ${word} without warning.`;
  }

  if (level === "elementary") {
    return `We can ${word} together after class.`;
  }
  if (level === "middle") {
    return `Students may ${word} during the activity.`;
  }
  return `People may ${word} in different ways.`;
}

function buildAdjectiveSentence(word, level) {
  const normalized = normalizeEnglish(word);

  if (normalized === "able") {
    return "She is able to solve the problem.";
  }
  if (normalized === "absent") {
    return "He was absent from school today.";
  }
  if (normalized === "aboard") {
    return "All the passengers are aboard now.";
  }
  if (normalized === "average") {
    return "Her score was average for the class.";
  }
  if (normalized === "afraid") {
    return "The child felt afraid in the dark.";
  }
  if (normalized === "abstract") {
    return "The idea was too abstract for young students.";
  }
  if (normalized === "absurd") {
    return "That rumor sounds absurd.";
  }
  if (normalized === "absolute") {
    return "No rule is absolute in every case.";
  }
  if (normalized === "adequate") {
    return "We have adequate time to finish.";
  }
  if (normalized === "alone") {
    return "She stayed alone at home for an hour.";
  }
  if (normalized === "alright") {
    return "Everything is alright now.";
  }

  if (level === "elementary") {
    return `That looks ${word} to me.`;
  }
  if (level === "middle") {
    return `That seems ${word} in this case.`;
  }
  return `That seems ${word} in this situation.`;
}

function buildAdverbSentence(word, level) {
  if (level === "elementary") {
    return `He spoke ${word} in class.`;
  }
  if (level === "middle") {
    return `She answered ${word} during the interview.`;
  }
  return `The project moved ${word} through each stage.`;
}

function buildFunctionSentence(word, level) {
  if (FUNCTION_WORD_EXAMPLES[normalizeEnglish(word)]) {
    return FUNCTION_WORD_EXAMPLES[normalizeEnglish(word)];
  }

  if (level === "elementary") {
    return `We use "${word}" in a short sentence.`;
  }
  if (level === "middle") {
    return `Students use "${word}" to connect ideas in a sentence.`;
  }
  return `Writers use "${word}" to shape meaning in a sentence.`;
}

function buildExampleSentence(entry, wordbookIndex) {
  const level = pickLevel(entry.category);
  const pos = inferPos(entry, wordbookIndex);

  if (pos === "n") {
    return buildNounSentence(entry, level);
  }
  if (pos === "adj") {
    return buildAdjectiveSentence(entry.word, level);
  }
  if (pos === "adv") {
    return buildAdverbSentence(entry.word, level);
  }
  if (pos === "v") {
    const gloss = firstGloss(entry);

    if (/많다|풍부하다/.test(gloss)) {
      return `Fresh flowers ${entry.word} in the garden in spring.`;
    }

    if (isStateLikeVerb(entry)) {
      return buildFunctionSentence(entry.word, level);
    }

    return buildVerbSentence(entry, level);
  }
  return buildFunctionSentence(entry.word, level);
}

async function main() {
  const pdfBuffer = fs.readFileSync(WORDBOOK_PDF);
  const wordbook = await pdf(pdfBuffer);
  const wordbookIndex = parseWordbookEntries(wordbook.text);
  const basePayload = loadJson(BASE_DATA_FILE);
  const supplementalPayload = loadJson(SUPPLEMENTAL_DATA_FILE);
  const targets = [...basePayload.words, ...supplementalPayload.words].filter((entry) => !isExpressionEntry(entry));
  const items = targets.map((entry) => ({
    id: entry.id,
    exampleSentence: buildExampleSentence(entry, wordbookIndex)
  }));
  const categoryCounts = targets.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1;
    return acc;
  }, {});

  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      total: items.length,
      ...categoryCounts
    },
    items
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        output: path.relative(ROOT, OUTPUT_FILE),
        stats: payload.stats,
        sample: items.slice(0, 8)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
