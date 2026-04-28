import { GO_ANALYTICS_CONSENT_STORAGE_KEY } from './go-analytics.types';
import {
  readStoredAnalyticsConsent,
  writeStoredAnalyticsConsent,
} from './go-analytics-consent.service';

describe('analytics consent storage helpers', () => {
  it('reads granted and denied choices from storage', () => {
    expect(storageBackedBy('granted')).toBe('granted');
    expect(storageBackedBy('denied')).toBe('denied');
  });

  it('treats missing or corrupted storage as undecided consent', () => {
    expect(storageBackedBy(null)).toBeNull();
    expect(storageBackedBy('maybe')).toBeNull();
  });

  it('treats unavailable storage reads as undecided consent', () => {
    expect(
      readStoredAnalyticsConsent({
        getItem: () => {
          throw new Error('storage unavailable');
        },
      }),
    ).toBeNull();
  });

  it('writes the selected consent choice with the versioned key', () => {
    const writes: Array<{ key: string; value: string }> = [];

    writeStoredAnalyticsConsent(
      {
        setItem: (key, value) => {
          writes.push({ key, value });
        },
      },
      'granted',
    );

    expect(writes).toEqual([
      {
        key: GO_ANALYTICS_CONSENT_STORAGE_KEY,
        value: 'granted',
      },
    ]);
  });

  it('writes denied consent with the versioned key', () => {
    const writes: Array<{ key: string; value: string }> = [];

    writeStoredAnalyticsConsent(
      {
        setItem: (key, value) => {
          writes.push({ key, value });
        },
      },
      'denied',
    );

    expect(writes).toEqual([
      {
        key: GO_ANALYTICS_CONSENT_STORAGE_KEY,
        value: 'denied',
      },
    ]);
  });

  it('does not throw when storage writes are unavailable', () => {
    expect(() =>
      writeStoredAnalyticsConsent(
        {
          setItem: () => {
            throw new Error('storage full');
          },
        },
        'granted',
      ),
    ).not.toThrow();
  });
});

function storageBackedBy(value: string | null) {
  return readStoredAnalyticsConsent({
    getItem: (key) => (key === GO_ANALYTICS_CONSENT_STORAGE_KEY ? value : null),
  });
}
