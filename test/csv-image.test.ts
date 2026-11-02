import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { csvCell, toCsv } from '../src/lib/csv';
import { sanitiseImage, sniffImage, stripJpeg, stripPng } from '../src/lib/image';

describe('csv', () => {
  it('neutralises spreadsheet formulas from public input', () => {
    assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
    assert.equal(csvCell('+cmd'), "'+cmd");
    assert.equal(csvCell('-1+1'), "'-1+1");
    assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  });

  it('quotes commas, quotes and newlines', () => {
    assert.equal(csvCell('a,b'), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell('line\nbreak'), '"line\nbreak"');
  });

  it('renders nulls as empty and dates as ISO', () => {
    assert.equal(csvCell(null), '');
    assert.equal(csvCell(new Date('2026-01-02T03:04:05Z')), '2026-01-02T03:04:05.000Z');
  });

  it('starts with a BOM so Excel reads UTF-8', () => {
    assert.ok(toCsv(['a'], [['é']]).startsWith('﻿a\r\né'));
  });
});

/* A minimal JPEG: SOI, APP0 (JFIF), APP1 (fake EXIF with GPS text), COM,
   DQT, SOS + scan bytes, EOI. Not decodable, but structurally a JPEG. */
function seg(marker: number, payload: Buffer): Buffer {
  const len = Buffer.alloc(2);
  len.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), len, payload]);
}
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
  seg(0xe1, Buffer.from('Exif\0\0GPS -1.9497 30.1263 SECRET', 'latin1')),
  seg(0xfe, Buffer.from('owner: Jane SECRET', 'latin1')),
  seg(0xdb, Buffer.alloc(65, 1)),
  seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
  Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56]),
  Buffer.from([0xff, 0xd9]),
]);

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', Buffer.alloc(13)),
  chunk('tEXt', Buffer.from('Author\0SECRET', 'latin1')),
  chunk('eXIf', Buffer.from('SECRET', 'latin1')),
  chunk('IDAT', Buffer.alloc(10, 7)),
  chunk('IEND', Buffer.alloc(0)),
]);

describe('image sanitising', () => {
  it('identifies images by their bytes, not their name', () => {
    assert.equal(sniffImage(jpeg), 'jpeg');
    assert.equal(sniffImage(png), 'png');
    assert.equal(sniffImage(Buffer.from('<svg onload=alert(1)>')), null);
    assert.equal(sniffImage(Buffer.from('GIF89a')), null);
  });

  it('strips EXIF and comments from a JPEG and keeps the image data', () => {
    const out = stripJpeg(jpeg);
    assert.ok(out !== null);
    assert.equal(out.includes(Buffer.from('SECRET')), false);
    assert.ok(out.includes(Buffer.from('JFIF')));
    assert.ok(out.includes(Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56])));
    assert.deepEqual([...out.subarray(-2)], [0xff, 0xd9]);
  });

  it('strips text and EXIF chunks from a PNG', () => {
    const out = stripPng(png);
    assert.ok(out !== null);
    assert.equal(out.includes(Buffer.from('SECRET')), false);
    assert.ok(out.includes(Buffer.from('IDAT')));
    assert.ok(out.includes(Buffer.from('IEND')));
  });

  it('rejects truncated or lying files', () => {
    assert.equal(stripJpeg(jpeg.subarray(0, 20)), null);
    assert.equal(stripPng(png.subarray(0, 30)), null);
    assert.equal(sanitiseImage(Buffer.from('not an image at all')), null);
  });
});
