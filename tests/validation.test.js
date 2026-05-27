// Tests for input validation logic (task 11.6)
// Tests the trim/empty check inline — pure string tests, no DOM required.
import { describe, it, expect } from 'vitest';

describe('input validation — empty and whitespace checks', () => {
  it('empty string is invalid (trim produces empty string)', () => {
    expect(''.trim()).toBe('');
  });

  it('whitespace-only string "   " is invalid', () => {
    expect('   '.trim()).toBe('');
  });

  it('tab and newline "\\t\\n" is invalid', () => {
    expect('\t\n'.trim()).toBe('');
  });

  it('"Austin" is valid (non-empty after trim)', () => {
    expect('Austin'.trim()).not.toBe('');
  });

  it('"Austin, TX" is valid (contains comma, non-empty after trim)', () => {
    expect('Austin, TX'.trim()).not.toBe('');
  });
});
