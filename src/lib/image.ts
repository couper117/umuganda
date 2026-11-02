/**
 * lib/image.ts — accept a photo without accepting what is hidden in it.
 *
 * A phone photo carries EXIF: the exact GPS position it was taken at, the
 * device, sometimes the owner's name. A resident who chose to report
 * anonymously should not have their home coordinates handed to whoever opens
 * the image. The browser already re-encodes photos through a canvas, which
 * drops all of that, but a request can skip the browser, so the server strips
 * metadata again here.
 *
 * Two formats only, identified by their bytes rather than by the filename or
 * the declared content type, both of which the client controls:
 *
 *   JPEG: walk the segments, keep the ones that make the picture, drop APPn
 *         (EXIF, XMP, ICC, maker notes) and COM.
 *   PNG:  walk the chunks, keep the critical ones and the few ancillary chunks
 *         that affect how it looks, drop text, EXIF and timestamps.
 *
 * No native image library is involved, so there is nothing to compile and no
 * decoder exposed to hostile input; this only copies byte ranges.
 */

export type ImageKind = 'jpeg' | 'png';

export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) return 'png';
  return null;
}

/**
 * Remove metadata from a JPEG. Returns null if the file is not a well-formed
 * JPEG up to its image data, which is treated as a rejection.
 */
export function stripJpeg(buf: Buffer): Buffer | null {
  if (sniffImage(buf) !== 'jpeg') return null;

  const parts: Buffer[] = [buf.subarray(0, 2)]; // SOI
  let i = 2;

  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    // Fill bytes: any number of 0xFF may precede a marker.
    while (i < buf.length && buf[i] === 0xff) i += 1;
    if (i >= buf.length) return null;
    const marker = buf[i] as number;
    const markerStart = i - 1;
    i += 1;

    // Markers with no length field.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(buf.subarray(markerStart, i));
      continue;
    }
    if (marker === 0xd9) {
      parts.push(buf.subarray(markerStart, i));
      return Buffer.concat(parts);
    }

    if (i + 2 > buf.length) return null;
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) return null;
    const segmentEnd = i + len;

    const isAppN = marker >= 0xe0 && marker <= 0xef;
    const isComment = marker === 0xfe;
    // Keep APP0 (JFIF) only: it carries nothing personal and some decoders
    // want it. Everything else in the APPn range is metadata.
    const keep = !(isComment || (isAppN && marker !== 0xe0));
    if (keep) parts.push(buf.subarray(markerStart, segmentEnd));

    i = segmentEnd;

    // Start of scan: the entropy-coded image follows until EOI. Copy the rest
    // verbatim; metadata does not live inside the scan.
    if (marker === 0xda) {
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
  }
  return null;
}

/** Ancillary PNG chunks that change how the image renders. Everything else
 *  ancillary — tEXt, zTXt, iTXt, eXIf, tIME and private chunks — is dropped. */
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs']);

export function stripPng(buf: Buffer): Buffer | null {
  if (sniffImage(buf) !== 'png') return null;
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let i = 8;
  let sawEnd = false;

  while (i + 8 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (!/^[A-Za-z]{4}$/.test(type) || end > buf.length) return null;
    if (PNG_KEEP.has(type)) parts.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') {
      sawEnd = true;
      break;
    }
  }
  return sawEnd ? Buffer.concat(parts) : null;
}

/** Sniff and strip in one step. Null means "not an image we accept". */
export function sanitiseImage(buf: Buffer): { kind: ImageKind; data: Buffer } | null {
  const kind = sniffImage(buf);
  if (kind === 'jpeg') {
    const data = stripJpeg(buf);
    return data === null ? null : { kind, data };
  }
  if (kind === 'png') {
    const data = stripPng(buf);
    return data === null ? null : { kind, data };
  }
  return null;
}
