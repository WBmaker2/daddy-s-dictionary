function notifyStatus(onStatus, status) {
  try {
    const notification = onStatus?.(status);
    Promise.resolve(notification).catch(() => {});
  } catch {
    // A display callback must never prevent the dictionary from starting.
  }
}

function trackOfflineReadiness({ navigatorObject, onStatus }) {
  const serviceWorker = navigatorObject?.serviceWorker;

  if (!serviceWorker || typeof serviceWorker.register !== "function") {
    notifyStatus(onStatus, "unsupported");
    return Promise.resolve("unsupported");
  }

  notifyStatus(onStatus, "preparing");

  let registration;
  try {
    registration = serviceWorker.register("./sw.js");
  } catch {
    notifyStatus(onStatus, "failed");
    return Promise.resolve("failed");
  }

  return Promise.resolve(registration)
    .then(() => serviceWorker.ready)
    .then(() => {
      notifyStatus(onStatus, "ready");
      return "ready";
    })
    .catch(() => {
      notifyStatus(onStatus, "failed");
      return "failed";
    });
}

export { trackOfflineReadiness };
