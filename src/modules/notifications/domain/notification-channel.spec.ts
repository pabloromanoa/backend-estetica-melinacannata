import { toWhatsAppNumber } from './notification-channel';

describe('toWhatsAppNumber', () => {
  it.each([
    ['+54 9 11 4829-1102', '5491148291102'],
    ['54 11 4829-1102', '5491148291102'],
    ['011 15 4829-1102', '5491148291102'],
    ['11 4829-1102', '5491148291102'],
  ])('%s → %s', (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });
});
