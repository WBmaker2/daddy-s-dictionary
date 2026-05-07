export function createPronunciationController({
  browserWindow,
  comparePronunciation,
  updateBanner,
  createUtterance,
  logError = console.error
}) {
  let activeRecognition = null;
  let audioContext = null;

  function getAudioContext() {
    const AudioContextCtor = browserWindow.AudioContext || browserWindow.webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch((error) => {
        logError(error);
      });
    }

    return audioContext;
  }

  function playCelebrationChime() {
    const activeAudioContext = getAudioContext();

    if (!activeAudioContext) {
      return;
    }

    const notes = [
      { frequency: 523.25, duration: 0.12, delay: 0 },
      { frequency: 659.25, duration: 0.14, delay: 0.08 },
      { frequency: 783.99, duration: 0.18, delay: 0.16 }
    ];
    const now = activeAudioContext.currentTime;

    for (const note of notes) {
      const oscillator = activeAudioContext.createOscillator();
      const gainNode = activeAudioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, now + note.delay);

      gainNode.gain.setValueAtTime(0.0001, now + note.delay);
      gainNode.gain.exponentialRampToValueAtTime(0.14, now + note.delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);

      oscillator.connect(gainNode);
      gainNode.connect(activeAudioContext.destination);

      oscillator.start(now + note.delay);
      oscillator.stop(now + note.delay + note.duration + 0.02);
    }
  }

  function stopPronunciationCheck() {
    if (!activeRecognition) {
      return;
    }

    activeRecognition.onresult = null;
    activeRecognition.onerror = null;
    activeRecognition.onend = null;

    try {
      activeRecognition.stop();
    } catch (error) {
      logError(error);
    }

    activeRecognition = null;
  }

  function speakWord(word, feedbackNode) {
    if (!("speechSynthesis" in browserWindow)) {
      feedbackNode.textContent = "이 브라우저에서는 음성 합성을 지원하지 않습니다.";
      return;
    }

    const speakText = word.speakText || word.word;
    const makeUtterance =
      createUtterance ??
      ((text) => {
        const UtteranceCtor =
          browserWindow.SpeechSynthesisUtterance ?? globalThis.SpeechSynthesisUtterance;

        if (!UtteranceCtor) {
          throw new Error("SpeechSynthesisUtterance is not available.");
        }

        return new UtteranceCtor(text);
      });
    const utterance = makeUtterance(speakText);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1.02;

    browserWindow.speechSynthesis.cancel();
    browserWindow.speechSynthesis.speak(utterance);
    feedbackNode.textContent = `"${word.word}" 발음을 들려주고 있습니다.`;
  }

  function startPronunciationCheck(word, feedbackNode) {
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      feedbackNode.textContent = "이 브라우저에서는 말하기 점검을 지원하지 않습니다.";
      return;
    }

    stopPronunciationCheck();

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    activeRecognition = recognition;

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
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
    };

    try {
      recognition.start();
    } catch (error) {
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
      feedbackNode.textContent = "마이크를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      updateBanner("말하기 점검을 시작하지 못했습니다.", "warning", "pronunciation");
      logError(error);
    }
  }

  return {
    speakWord,
    startPronunciationCheck,
    stopPronunciationCheck
  };
}
