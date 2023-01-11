export function urlCheckOrGo(url: string, exclude?: string) {
  if (urlCheck(url, exclude)) return true;
  window.location.href = url;
  return false;
}

export function urlCheck(url: string | string[], exclude?: string) {
  if (typeof url === "string") url = [url];
  if (exclude && window.location.href.includes(exclude)) return false;
  return url.some((u) => window.location.href.includes(u));
}
