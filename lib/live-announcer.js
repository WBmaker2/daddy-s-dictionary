export function createLiveAnnouncer({
  onAnnounce,
  delay = 250,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
}) {
  let timeoutId = null;

  return (message) => {
    if (timeoutId !== null) {
      clearTimeoutFn(timeoutId);
    }

    timeoutId = setTimeoutFn(() => {
      timeoutId = null;
      onAnnounce(message);
    }, delay);
  };
}
