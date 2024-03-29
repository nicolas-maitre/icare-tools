export function async_requestAnimationFrame(): Promise<DOMHighResTimeStamp> {
  return new Promise((res) => requestAnimationFrame(res));
}

export function async_setTimeout(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function waitForSelector<T extends HTMLElement>(
  selector: string | (() => T | null) | (() => Promise<T | null>),
  checkInterval = 100,
  maxChecks = 50
): Promise<T> {
  const res =
    typeof selector === "function" ? await selector() : document.querySelector<T>(selector);

  return await new Promise((resolve, reject) => {
    if (res === null) {
      if (maxChecks <= 0) {
        reject(new Error(`can't find element ${selector.toString()}`));
        return;
      }
      setTimeout(
        () =>
          waitForSelector(selector, checkInterval, maxChecks - 1)
            .then(resolve)
            .catch(reject),
        checkInterval
      );
    } else {
      resolve(res);
    }
  });
}

export async function waitForValue<T>(
  getter: () => (T | undefined) | Promise<T | undefined>,
  checkInterval = 100,
  maxChecks = 50 //~5 seconds
): Promise<T | undefined> {
  const res = await getter();
  return new Promise((resolve) => {
    if (res === undefined) {
      if (maxChecks <= 0) {
        resolve(undefined);
        return;
      }
      setTimeout(
        () => waitForValue(getter, checkInterval, maxChecks - 1).then(resolve),
        checkInterval
      );
    } else {
      resolve(res);
    }
  });
}

export function waitForSelectorAll<T extends HTMLElement>(
  selector: string | (() => NodeListOf<T>),
  minCount = 1,
  checkInterval = 100,
  maxChecks = 50
): Promise<NodeListOf<T>> {
  console.log("waitForSelectorAll", maxChecks);
  const res = typeof selector === "function" ? selector() : document.querySelectorAll<T>(selector);

  return new Promise((resolve, reject) => {
    if (res.length < minCount) {
      if (maxChecks <= 0) {
        reject(new Error(`can't find elements ${selector.toString()}`));
        return;
      }
      setTimeout(
        () =>
          waitForSelectorAll(selector, minCount, checkInterval, maxChecks - 1)
            .then(resolve)
            .catch(reject),
        checkInterval
      );
    } else {
      resolve(res);
    }
  });
}
