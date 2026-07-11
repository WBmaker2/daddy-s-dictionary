export function renderLoadFailure({ container, message, onRetry }) {
  const documentRef = container.ownerDocument ?? document;
  const recovery = documentRef.createElement("div");
  const copy = documentRef.createElement("p");
  const retryButton = documentRef.createElement("button");

  recovery.className = "load-failure";
  recovery.setAttribute("role", "status");
  recovery.setAttribute("aria-live", "polite");
  recovery.setAttribute("aria-atomic", "true");
  copy.textContent = message;
  retryButton.type = "button";
  retryButton.textContent = "다시 시도";
  retryButton.setAttribute("aria-busy", "false");
  retryButton.addEventListener("click", async () => {
    if (retryButton.disabled) {
      return;
    }

    retryButton.disabled = true;
    retryButton.textContent = "다시 시도 중...";
    retryButton.setAttribute("aria-busy", "true");

    try {
      await onRetry?.();
    } catch {
      // The app renders the next recovery state after a failed retry.
    } finally {
      retryButton.disabled = false;
      retryButton.textContent = "다시 시도";
      retryButton.setAttribute("aria-busy", "false");
    }
  });

  recovery.append(copy, retryButton);
  container.replaceChildren(recovery);

  return recovery;
}
