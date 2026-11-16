import assert from 'node:assert/strict';
import test from 'node:test';
import { add, compactNgn, formatNgn, formatUsd, neg, parseNgn, pctOf, roundMinor, sub, sum, times, toMinor } from './money.js';
import type { Minor } from './money.js';

const kobo = (value: number): Minor => value as Minor;

test('converts naira to kobo without float drift', () => {
  assert.equal(toMinor(268400), 26_840_000);
  assert.equal(toMinor(61.45), 6145);
  assert.equal(toMinor(0.1), 10);
  assert.equal(toMinor(0.1) + toMinor(0.2), 30);
});

test('formats minor units exactly', () => {
  assert.equal(formatNgn(kobo(26_840_000)), '₦268,400');
  assert.equal(formatNgn(kobo(26_840_050), 2), '₦268,400.50');
  assert.equal(formatNgn(kobo(30), 2), '₦0.30');
  assert.equal(formatNgn(kobo(-2_500_000)), '₦-25,000');
  assert.equal(formatUsd(kobo(24_000)), '$240.00');
  assert.equal(formatUsd(kobo(6145)), '$61.45');
});

test('compacts large naira amounts', () => {
  assert.equal(compactNgn(kobo(41_250_000)), '₦413k');
  assert.equal(compactNgn(kobo(185_000_000)), '₦1.9m');
  assert.equal(compactNgn(kobo(2_227_000_000)), '₦22.3m');
  assert.equal(compactNgn(kobo(150_000_000_000)), '₦1.5b');
});

test('parses naira input, rejecting anything malformed', () => {
  assert.equal(parseNgn('5,000'), 500_000);
  assert.equal(parseNgn('5,000.50'), 500_050);
  assert.equal(parseNgn('₦ 12 500'), 1_250_000);
  assert.equal(parseNgn('0.1'), 10);
  assert.equal(parseNgn(''), null);
  assert.equal(parseNgn('abc'), null);
  assert.equal(parseNgn('1.234'), null);
  assert.equal(parseNgn('-500'), null);
});

test('keeps arithmetic in whole minor units', () => {
  const wallet = toMinor(26_840_000);
  assert.equal(sub(wallet, toMinor(2_500_000)), toMinor(24_340_000));
  assert.equal(add(wallet, toMinor(1_500_000)), toMinor(28_340_000));
  assert.equal(neg(toMinor(500)), toMinor(-500));
  assert.equal(sum([toMinor(100), toMinor(250), toMinor(50)]), toMinor(400));
  assert.equal(times(120, toMinor(635)), toMinor(76_200));
  assert.equal(pctOf(toMinor(635), 1.5), 953);
});

test('rounds an already-minor average without re-scaling it', () => {
  const weighted = (58_800 * 120 + 635_000) / 130;
  assert.equal(roundMinor(weighted), 59_162);
  assert.equal(roundMinor(weighted) / 100, 591.62);
  assert.notEqual(roundMinor(weighted), toMinor(weighted));
});
