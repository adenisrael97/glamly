/**
 * SWR fetcher. Throws on non-2xx so SWR surfaces it as `error`.
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetcher(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error("Network response was not ok");
    err.status = res.status;
    err.info = await res.json().catch(() => null);
    throw err;
  }
  return res.json();
}
