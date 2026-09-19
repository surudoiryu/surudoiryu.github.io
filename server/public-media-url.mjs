const MEDIA_ID = /^c[a-z0-9]{24}$/;

/** Static HTML serialization only; no signing, proxy or credentials. */
export function publicMediaUrl(mediaId, placeholder = "/android-chrome-192x192.png") {
  const id = String(mediaId ?? "").trim();
  return MEDIA_ID.test(id) ? `https://media.verdiq.nl/${id}` : placeholder;
}
