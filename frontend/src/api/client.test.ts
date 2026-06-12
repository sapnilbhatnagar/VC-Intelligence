import { describe, it, expect } from 'vitest';
import { normalizeApiError } from './client';

describe('normalizeApiError', () => {
  it('passes plain string details through', () => {
    expect(normalizeApiError({ detail: 'Insufficient credits.' })).toBe('Insufficient credits.');
  });

  it('turns FastAPI 422 validation arrays into readable text, never [object Object]', () => {
    const data = {
      detail: [
        {
          type: 'string_pattern_mismatch',
          loc: ['body', 'llm_provider'],
          msg: "String should match pattern '^(anthropic|openai|deepseek|glm)$'",
          input: 'nvidia',
        },
      ],
    };
    const msg = normalizeApiError(data);
    expect(msg).toContain('llm_provider');
    expect(msg).toContain('String should match pattern');
    expect(msg).not.toContain('[object Object]');
  });

  it('joins multiple validation errors', () => {
    const data = {
      detail: [
        { loc: ['body', 'api_key'], msg: 'String should have at least 8 characters' },
        { loc: ['body', 'email'], msg: 'value is not a valid email address' },
      ],
    };
    const msg = normalizeApiError(data);
    expect(msg).toContain('api_key');
    expect(msg).toContain('email');
  });

  it('serializes unexpected object details instead of stringifying them', () => {
    const msg = normalizeApiError({ detail: { code: 42, reason: 'odd' } });
    expect(msg).toContain('odd');
    expect(msg).not.toBe('[object Object]');
  });

  it('returns null when there is no detail to extract', () => {
    expect(normalizeApiError(undefined)).toBeNull();
    expect(normalizeApiError({})).toBeNull();
    expect(normalizeApiError('plain text body')).toBeNull();
  });
});
