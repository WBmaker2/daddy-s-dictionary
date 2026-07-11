function createAppStartup({ startOfflineReadiness, loadDictionary }) {
  let offlineReadinessStarted = false;

  function loadDictionaryWithOfflineReadiness() {
    if (!offlineReadinessStarted) {
      offlineReadinessStarted = true;

      try {
        startOfflineReadiness();
      } catch {
        // Offline setup is optional and must not prevent dictionary recovery.
      }
    }

    return loadDictionary();
  }

  return { loadDictionary: loadDictionaryWithOfflineReadiness };
}

export { createAppStartup };
