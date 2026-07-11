import test from "node:test";
import assert from "node:assert/strict";

import { renderDataWarning, updateBanner } from "../lib/status-regions.js";

function createStatusRegion() {
  return {
    hidden: true,
    textContent: "",
    dataset: {}
  };
}

test("dedicated data warning survives pronunciation clears and network banner updates", () => {
  const dataWarning = createStatusRegion();
  const banner = createStatusRegion();
  const warningCopy = "일부 확장 자료를 불러오지 못했지만 기본 영단어 검색은 사용할 수 있습니다.";

  renderDataWarning({ container: dataWarning, message: warningCopy });
  updateBanner({ container: banner, text: "말하기 점검 완료", source: "pronunciation" });
  updateBanner({ container: banner, text: "" });
  updateBanner({ container: banner, text: "인터넷이 연결되었습니다.", source: "network" });
  updateBanner({ container: banner, text: "오프라인 상태입니다.", tone: "warning", source: "network" });

  assert.equal(dataWarning.hidden, false);
  assert.equal(dataWarning.textContent, warningCopy);
});

test("renderDataWarning clears only the dedicated warning region when optional data is available", () => {
  const dataWarning = createStatusRegion();

  renderDataWarning({ container: dataWarning, message: "확장 자료 경고" });
  renderDataWarning({ container: dataWarning, message: "" });

  assert.equal(dataWarning.hidden, true);
  assert.equal(dataWarning.textContent, "");
});
