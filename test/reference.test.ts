import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatReference, generateToken, parseReference, referenceMatches, TOKEN_LENGTH } from '../src/lib/reference';

describe('reference tokens', () => {
  it('generates tokens from the unambiguous alphabet only', () => {
    for (let i = 0; i < 500; i += 1) {
      const t = generateToken();
      assert.equal(t.length, TOKEN_LENGTH);
      assert.match(t, /^[2-9A-HJKMNP-Z]+$/);
    }
  });

  it('round-trips through format and parse', () => {
    const token = generateToken();
    assert.deepEqual(parseReference(formatReference(42, token)), { id: 42, token });
  });

  it('accepts the forms people actually type', () => {
    assert.deepEqual(parseReference('ck-7-ab3def'), { id: 7, token: 'AB3DEF' });
    assert.deepEqual(parseReference(' CK 12 '), { id: 12, token: null });
    assert.deepEqual(parseReference('CK12'), { id: 12, token: null });
  });

  it('rejects malformed references', () => {
    for (const bad of ['', 'CK-', 'CK-0', 'CK-12-ABC', 'CK-12-ABCDE0', 'XK-12', 12, null, 'CK-1234567890']) {
      assert.equal(parseReference(bad), null, String(bad));
    }
  });
});

describe('referenceMatches', () => {
  it('requires the token once a report has one', () => {
    assert.ok(referenceMatches('AB3DEF', 'AB3DEF'));
    assert.equal(referenceMatches('AB3DEF', null), false);
    assert.equal(referenceMatches('AB3DEF', 'AB3DEG'), false);
  });

  it('lets a bare id through only for legacy reports with no token', () => {
    assert.ok(referenceMatches(null, null));
    assert.ok(referenceMatches('', null));
  });
});
