/** Room addressing for the public Live hub. A shared link has to land on the
 * room it names, and leaving one has to give the directory back. */

export const SESSION_PARAM = "session";

export function sessionFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(SESSION_PARAM);
  return id ? id : null;
}

export function roomLink(href: string, id: string): string {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(SESSION_PARAM, id);
  return url.href;
}

export function directoryLink(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(SESSION_PARAM);
  return url.href;
}
