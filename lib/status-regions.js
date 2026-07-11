export function updateBanner({ container, text, tone = "default", source = "system" }) {
  if (!text) {
    container.hidden = true;
    container.textContent = "";
    container.dataset.tone = "";
    container.dataset.source = "";
    return;
  }

  container.hidden = false;
  container.textContent = text;
  container.dataset.tone = tone;
  container.dataset.source = source;
}

export function renderDataWarning({ container, message }) {
  container.hidden = !message;
  container.textContent = message;
}
