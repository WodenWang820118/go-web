import { computed, Injectable, signal } from '@angular/core';
import {
  GO_ANALYTICS_CONSENT_STORAGE_KEY,
  GoAnalyticsConsentChoice,
} from './go-analytics.types';

@Injectable({ providedIn: 'root' })
export class GoAnalyticsConsentService {
  private readonly choiceSignal = signal<GoAnalyticsConsentChoice | null>(
    readStoredAnalyticsConsent(resolveStorage()),
  );

  readonly choice = this.choiceSignal.asReadonly();
  readonly resolved = signal(true).asReadonly();
  readonly canTrack = computed(() => this.choiceSignal() === 'granted');
  readonly shouldShowBanner = computed(() => this.choiceSignal() === null);

  accept(): void {
    this.setChoice('granted');
  }

  decline(): void {
    this.setChoice('denied');
  }

  private setChoice(choice: GoAnalyticsConsentChoice): void {
    writeStoredAnalyticsConsent(resolveStorage(), choice);
    this.choiceSignal.set(choice);
  }
}

export function readStoredAnalyticsConsent(
  storage: Pick<Storage, 'getItem'> | null,
): GoAnalyticsConsentChoice | null {
  try {
    const value = storage?.getItem(GO_ANALYTICS_CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredAnalyticsConsent(
  storage: Pick<Storage, 'setItem'> | null,
  choice: GoAnalyticsConsentChoice,
): void {
  try {
    storage?.setItem(GO_ANALYTICS_CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable in private modes; keep the in-memory choice.
  }
}

function resolveStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
