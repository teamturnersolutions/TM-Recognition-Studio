import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buildSampleRecognitionJson,
  parseRecognitionJson,
} from '../src/import/jsonImporter';
import { validatePhotoUrl } from '../src/media/photoProcessor';
import { useRecognitionSession } from '../src/state/useRecognitionSession';

describe('parseRecognitionJson', () => {
  it('parses the canonical sample JSON cleanly', () => {
    const draft = parseRecognitionJson(buildSampleRecognitionJson());

    expect(draft.recognitionPeriod).toBe('November 2026');
    expect(draft.nominees).toHaveLength(6);
    expect(draft.nominees[0].name).toBe('Caleb Okafor');
    expect(draft.nominees[4].name).toBe('Marcus Vance');
    expect(draft.winnerIndex).toBe(4);
    expect(draft.winnerCategory).toBe('Go the Extra Mile');
    expect(draft.winnerSummary).toContain('peak weekend hours');
    expect(draft.warnings).toHaveLength(0);
  });

  it('supports winnerName, 1-based winnerSlot, photoUrl aliases, and truncates >6 nominees with a warning', () => {
    const json = JSON.stringify({
      period: 'December 2026',
      nominees: [
        { name: 'Alice One', imageUrl: 'https://example.com/1.jpg' },
        'Bob Two',
        { name: 'Cara Three' },
        { name: 'Dan Four' },
        { name: 'Eve Five' },
        { name: 'Frank Six' },
        { name: 'Extra Seven' },
      ],
      winnerName: 'cara three',
      category: 'Teamwork',
      summary: 'Always jumps in to support every department.',
    });

    const draft = parseRecognitionJson(json);

    expect(draft.recognitionPeriod).toBe('December 2026');
    expect(draft.nominees[0].photoUrl).toBe('https://example.com/1.jpg');
    expect(draft.nominees[1].name).toBe('Bob Two');
    expect(draft.winnerIndex).toBe(2);
    expect(draft.winnerCategory).toBe('Teamwork');
    expect(draft.warnings.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON or payloads missing a nominees array', () => {
    expect(() => parseRecognitionJson('{bad json')).toThrow('Invalid JSON');
    expect(() => parseRecognitionJson('{"winnerIndex": 0}')).toThrow('nominees');
  });
});

describe('validatePhotoUrl', () => {
  it('accepts http and https image URLs and rejects invalid protocols', () => {
    expect(validatePhotoUrl('https://cdn.example.com/avatar.png').valid).toBe(true);
    expect(validatePhotoUrl('http://intranet.local/tm.jpg').valid).toBe(true);
    expect(validatePhotoUrl('javascript:alert(1)').valid).toBe(false);
    expect(validatePhotoUrl('not-a-url').valid).toBe(false);
    expect(validatePhotoUrl('   ').valid).toBe(false);
  });
});

describe('useRecognitionSession JSON import behavior', () => {
  it('populates form fields from JSON without leaving the builder view and clears on reset', async () => {
    const { result } = renderHook(() => useRecognitionSession('bjs-spotlight'));

    await act(async () => {
      const summary = await result.current.importFromJsonText(buildSampleRecognitionJson());
      expect(summary.populatedNominees).toBe(6);
      expect(summary.photoUrlsRequested).toBe(0);
    });

    // Must remain on builder view for review rather than jumping to preview
    expect(result.current.view).toBe('builder');
    expect(result.current.state.nominees[4].name).toBe('Marcus Vance');
    expect(result.current.state.winnerIndex).toBe(4);
    expect(result.current.state.winnerCategory).toBe('Go the Extra Mile');
    expect(result.current.validation.valid).toBe(true);

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.state.nominees.every((n) => n.name === '' && n.photo === null)).toBe(true);
    expect(result.current.nomineeUrlDrafts.every((u) => u === '')).toBe(true);
    expect(result.current.state.winnerIndex).toBeNull();
  });
});
