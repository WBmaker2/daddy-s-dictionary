import test from "node:test";
import assert from "node:assert/strict";

import { createPronunciationController } from "../lib/pronunciation-controls.js";

function createFeedbackNode() {
  return { textContent: "" };
}

function createBannerSpy() {
  const calls = [];
  return {
    calls,
    updateBanner(...args) {
      calls.push(args);
    }
  };
}

function createRecognitionHarness({ startError } = {}) {
  const instances = [];

  class FakeRecognition {
    constructor() {
      this.lang = "";
      this.interimResults = true;
      this.maxAlternatives = 1;
      this.continuous = true;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.startCalls = 0;
      this.stopCalls = 0;
      instances.push(this);
    }

    start() {
      this.startCalls += 1;
      if (startError) {
        throw startError;
      }
    }

    stop() {
      this.stopCalls += 1;
    }
  }

  return {
    FakeRecognition,
    instances
  };
}

function createAudioContextHarness({ state = "running" } = {}) {
  const contexts = [];

  class FakeAudioContext {
    constructor() {
      this.state = state;
      this.currentTime = 10;
      this.destination = { id: "speaker" };
      this.resumeCalls = 0;
      this.oscillators = [];
      this.gains = [];
      contexts.push(this);
    }

    resume() {
      this.resumeCalls += 1;
      return Promise.resolve();
    }

    createOscillator() {
      const oscillator = {
        type: null,
        frequencyEvents: [],
        connectedNode: null,
        startedAt: null,
        stoppedAt: null,
        frequency: {
          setValueAtTime: (value, time) => {
            oscillator.frequencyEvents.push({ value, time });
          }
        },
        connect: (node) => {
          oscillator.connectedNode = node;
        },
        start: (time) => {
          oscillator.startedAt = time;
        },
        stop: (time) => {
          oscillator.stoppedAt = time;
        }
      };

      this.oscillators.push(oscillator);
      return oscillator;
    }

    createGain() {
      const gainNode = {
        connectedNode: null,
        gainEvents: [],
        gain: {
          setValueAtTime: (value, time) => {
            gainNode.gainEvents.push({ type: "set", value, time });
          },
          exponentialRampToValueAtTime: (value, time) => {
            gainNode.gainEvents.push({ type: "ramp", value, time });
          }
        },
        connect: (node) => {
          gainNode.connectedNode = node;
        }
      };

      this.gains.push(gainNode);
      return gainNode;
    }
  }

  return {
    FakeAudioContext,
    contexts
  };
}

test("speakWord reports when speech synthesis is unavailable", () => {
  const feedbackNode = createFeedbackNode();
  const controller = createPronunciationController({
    browserWindow: {},
    comparePronunciation: () => {
      throw new Error("should not compare");
    },
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: () => {}
  });

  controller.speakWord({ word: "teacher" }, feedbackNode);

  assert.equal(feedbackNode.textContent, "이 브라우저에서는 음성 합성을 지원하지 않습니다.");
});

test("speakWord cancels the current speech, speaks the preferred text, and updates feedback", () => {
  const feedbackNode = createFeedbackNode();
  const speechCalls = [];
  const utterances = [];
  const controller = createPronunciationController({
    browserWindow: {
      speechSynthesis: {
        cancel() {
          speechCalls.push("cancel");
        },
        speak(utterance) {
          speechCalls.push(["speak", utterance]);
        }
      }
    },
    comparePronunciation: () => {
      throw new Error("should not compare");
    },
    createUtterance(text) {
      const utterance = { text };
      utterances.push(utterance);
      return utterance;
    },
    updateBanner: () => {}
  });

  controller.speakWord({ word: "teacher", speakText: "teacher's pet" }, feedbackNode);

  assert.deepEqual(speechCalls, ["cancel", ["speak", utterances[0]]]);
  assert.deepEqual(utterances[0], {
    text: "teacher's pet",
    lang: "en-US",
    rate: 0.92,
    pitch: 1.02
  });
  assert.equal(feedbackNode.textContent, '"teacher" 발음을 들려주고 있습니다.');
});

test("speakWord uses browserWindow SpeechSynthesisUtterance when no factory is injected", () => {
  const feedbackNode = createFeedbackNode();
  const spoken = [];

  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }

  const controller = createPronunciationController({
    browserWindow: {
      SpeechSynthesisUtterance: FakeUtterance,
      speechSynthesis: {
        cancel() {},
        speak(utterance) {
          spoken.push(utterance);
        }
      }
    },
    comparePronunciation: () => {
      throw new Error("should not compare");
    },
    updateBanner: () => {}
  });

  controller.speakWord({ word: "teacher" }, feedbackNode);

  assert.equal(spoken.length, 1);
  assert.ok(spoken[0] instanceof FakeUtterance);
  assert.equal(spoken[0].text, "teacher");
});

test("startPronunciationCheck reports when speech recognition is unavailable", () => {
  const feedbackNode = createFeedbackNode();
  const controller = createPronunciationController({
    browserWindow: {},
    comparePronunciation: () => {
      throw new Error("should not compare");
    },
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: () => {}
  });

  controller.startPronunciationCheck({ word: "teacher", forms: ["teacher"] }, feedbackNode);

  assert.equal(feedbackNode.textContent, "이 브라우저에서는 말하기 점검을 지원하지 않습니다.");
});

test("startPronunciationCheck configures recognition, updates listening state, and plays the success chime", () => {
  const feedbackNode = createFeedbackNode();
  const bannerSpy = createBannerSpy();
  const recognitionHarness = createRecognitionHarness();
  const audioHarness = createAudioContextHarness({ state: "suspended" });
  const compared = [];
  const controller = createPronunciationController({
    browserWindow: {
      SpeechRecognition: recognitionHarness.FakeRecognition,
      AudioContext: audioHarness.FakeAudioContext
    },
    comparePronunciation(forms, transcript) {
      compared.push({ forms, transcript });
      return {
        status: "excellent",
        text: `잘했어요: ${transcript}`
      };
    },
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: bannerSpy.updateBanner
  });

  controller.startPronunciationCheck({ word: "teacher", forms: ["teacher"] }, feedbackNode);

  const recognition = recognitionHarness.instances[0];
  assert.equal(recognition.lang, "en-US");
  assert.equal(recognition.interimResults, false);
  assert.equal(recognition.maxAlternatives, 3);
  assert.equal(recognition.continuous, false);
  assert.equal(recognition.startCalls, 1);
  assert.equal(feedbackNode.textContent, "듣는 중입니다...");
  assert.deepEqual(bannerSpy.calls[0], ['"teacher"를 또박또박 말해 보세요.', "listening", "pronunciation"]);

  recognition.onresult({
    results: [[{ transcript: "Teacher!" }]]
  });

  assert.deepEqual(compared, [{ forms: ["teacher"], transcript: "Teacher!" }]);
  assert.equal(feedbackNode.textContent, "잘했어요: Teacher!");
  assert.deepEqual(bannerSpy.calls[1], ["말하기 점검 완료: 잘했어요: Teacher!", "excellent", "pronunciation"]);
  assert.equal(audioHarness.contexts.length, 1);
  assert.equal(audioHarness.contexts[0].resumeCalls, 1);
  assert.equal(audioHarness.contexts[0].oscillators.length, 3);
  assert.equal(audioHarness.contexts[0].gains.length, 3);
});

test("starting a new pronunciation check stops and detaches the previous recognition instance", () => {
  const feedbackNode = createFeedbackNode();
  const recognitionHarness = createRecognitionHarness();
  const controller = createPronunciationController({
    browserWindow: {
      SpeechRecognition: recognitionHarness.FakeRecognition
    },
    comparePronunciation: () => ({
      status: "retry",
      text: "다시 시도"
    }),
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: () => {}
  });

  controller.startPronunciationCheck({ word: "teacher", forms: ["teacher"] }, feedbackNode);
  controller.startPronunciationCheck({ word: "apple", forms: ["apple"] }, feedbackNode);

  assert.equal(recognitionHarness.instances.length, 2);
  assert.equal(recognitionHarness.instances[0].stopCalls, 1);
  assert.equal(recognitionHarness.instances[0].onresult, null);
  assert.equal(recognitionHarness.instances[0].onerror, null);
  assert.equal(recognitionHarness.instances[0].onend, null);
  assert.equal(recognitionHarness.instances[1].startCalls, 1);
});

test("recognition onend clears the active session so later stops do not touch it again", () => {
  const feedbackNode = createFeedbackNode();
  const recognitionHarness = createRecognitionHarness();
  const controller = createPronunciationController({
    browserWindow: {
      SpeechRecognition: recognitionHarness.FakeRecognition
    },
    comparePronunciation: () => ({
      status: "retry",
      text: "다시 시도"
    }),
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: () => {}
  });

  controller.startPronunciationCheck({ word: "teacher", forms: ["teacher"] }, feedbackNode);
  recognitionHarness.instances[0].onend();
  controller.stopPronunciationCheck();

  assert.equal(recognitionHarness.instances[0].stopCalls, 0);
});

test("startPronunciationCheck maps recognition errors and handles start failures", () => {
  const feedbackNode = createFeedbackNode();
  const bannerSpy = createBannerSpy();
  const errors = [];
  const recognitionHarness = createRecognitionHarness({
    startError: new Error("microphone busy")
  });
  const controller = createPronunciationController({
    browserWindow: {
      SpeechRecognition: recognitionHarness.FakeRecognition
    },
    comparePronunciation: () => ({
      status: "retry",
      text: "다시 시도"
    }),
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: bannerSpy.updateBanner,
    logError(error) {
      errors.push(error.message);
    }
  });

  controller.startPronunciationCheck({ word: "teacher", forms: ["teacher"] }, feedbackNode);

  assert.equal(
    feedbackNode.textContent,
    "마이크를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요."
  );
  assert.deepEqual(bannerSpy.calls.at(-1), ["말하기 점검을 시작하지 못했습니다.", "warning", "pronunciation"]);
  assert.deepEqual(errors, ["microphone busy"]);
});

test("recognition error messages are surfaced to feedback and banner", () => {
  const feedbackNode = createFeedbackNode();
  const bannerSpy = createBannerSpy();
  const recognitionHarness = createRecognitionHarness();
  const controller = createPronunciationController({
    browserWindow: {
      SpeechRecognition: recognitionHarness.FakeRecognition
    },
    comparePronunciation: () => ({
      status: "retry",
      text: "다시 시도"
    }),
    createUtterance: () => {
      throw new Error("should not create utterance");
    },
    updateBanner: bannerSpy.updateBanner
  });

  controller.startPronunciationCheck({ word: "teacher", forms: ["teacher"] }, feedbackNode);
  recognitionHarness.instances[0].onerror({ error: "network" });

  assert.equal(feedbackNode.textContent, "음성 인식에 네트워크 연결이 필요할 수 있습니다.");
  assert.deepEqual(
    bannerSpy.calls.at(-1),
    ["음성 인식에 네트워크 연결이 필요할 수 있습니다.", "warning", "pronunciation"]
  );
});
