export function renderLoadFailure({ container, message, onRetry }) {
  const documentRef = container.ownerDocument ?? document;
  const recovery = documentRef.createElement("div");
  const copy = documentRef.createElement("p");
  const retryButton = documentRef.createElement("button");

  recovery.className = "load-failure";
  copy.textContent = message;
  retryButton.type = "button";
  retryButton.textContent = "다시 시도";
  retryButton.addEventListener("click", () => onRetry?.());

  recovery.append(copy, retryButton);
  container.replaceChildren(recovery);

  return recovery;
}
