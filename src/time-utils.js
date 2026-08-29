/** Parse the strict time formats accepted by the editor. */
export function parseEditorTime(value) {
  const text = String(value ?? "").trim().replace(/^\[/u, "").replace(/\]$/u, "");
  if (!text) return null;
  let match = text.match(/^(\d+):([0-5]\d):([0-5]\d)[.:](\d{1,3})$/u);
  if (match) return withMilliseconds(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]), match[4]);
  match = text.match(/^(\d+):([0-5]\d):(\d{1,3})$/u);
  if (match) return withMilliseconds(Number(match[1]) * 60 + Number(match[2]), match[3]);
  match = text.match(/^(\d+):([0-5]\d)(?:[.:](\d{1,3}))?$/u);
  if (match) return withMilliseconds(Number(match[1]) * 60 + Number(match[2]), match[3] || "0");
  if (/^\d+(?:\.\d+)?$/u.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) ? seconds : null;
  }
  return null;
}

function withMilliseconds(wholeSeconds, milliseconds) {
  const fraction = Number(milliseconds);
  return Number.isFinite(wholeSeconds) && Number.isInteger(fraction) && fraction >= 0 && fraction <= 999
    ? wholeSeconds + fraction / 1000
    : null;
}
