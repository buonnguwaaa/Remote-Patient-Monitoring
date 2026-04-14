const listeners = new Set();

export function subscribeNotificationEvents(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitNotificationEvent(event) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn("[push] notification event listener failed", error);
    }
  });
}
