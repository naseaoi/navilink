type VisibilityCallback = () => void;

const callbacks = new Map<Element, VisibilityCallback>();
let observer: IntersectionObserver | null = null;

const getObserver = () => {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const callback = callbacks.get(entry.target);
      callbacks.delete(entry.target);
      observer?.unobserve(entry.target);
      callback?.();
    });
  }, { rootMargin: '200px' });
  return observer;
};

export const observeVisibility = (element: Element, callback: VisibilityCallback) => {
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => {};
  }
  callbacks.set(element, callback);
  getObserver().observe(element);
  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
  };
};
