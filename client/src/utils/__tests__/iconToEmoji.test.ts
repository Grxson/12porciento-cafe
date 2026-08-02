import { describe, expect, it } from 'vitest';
import { iconToEmoji } from '../iconToEmoji';

describe('iconToEmoji', () => {
  it('converts legacy brewing icon names into visible emoji', () => {
    expect(iconToEmoji('triangle')).toBe('🔺');
    expect(iconToEmoji('circle-plus')).toBe('➕');
    expect(iconToEmoji('legacy-unknown-icon')).toBe('🏆');
  });
});
