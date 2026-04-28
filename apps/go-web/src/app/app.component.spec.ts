import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';

@Component({
  standalone: true,
  template: '<p>Lobby page</p>',
})
class DummyLobbyPageComponent {}

@Component({
  standalone: true,
  template: '<p>Room page</p>',
})
class DummyRoomPageComponent {}

@Component({
  standalone: true,
  template: '<p>Privacy page</p>',
})
class DummyPrivacyPageComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    window.dataLayer = [];
    document
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
    document
      .querySelectorAll('.p-dialog-mask, .p-dialog')
      .forEach((element) => element.remove());
    document.title = '';
    document.head
      .querySelectorAll('meta[name], meta[property], link[rel]')
      .forEach((element) => element.remove());

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          {
            path: '',
            component: DummyLobbyPageComponent,
          },
          {
            path: 'online/room/:roomId',
            component: DummyRoomPageComponent,
          },
          {
            path: 'privacy',
            component: DummyPrivacyPageComponent,
          },
        ]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    window.dataLayer = [];
    document
      .querySelectorAll('script[id^="gx-gtm-script-"]')
      .forEach((element) => element.remove());
    document
      .querySelectorAll('.p-dialog-mask, .p-dialog')
      .forEach((element) => element.remove());
  });

  it('creates the root shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the analytics consent banner until a choice is made', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-banner"]',
      ),
    ).not.toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-settings')).toBeNull();
  });

  it('opens the analytics preferences dialog from the banner', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(queryByTestId(fixture, 'analytics-consent-dialog')).toBeNull();

    queryButton(fixture, 'analytics-consent-privacy-link').click();
    fixture.detectChanges();

    expect(queryByTestId(fixture, 'analytics-consent-dialog')).not.toBeNull();
    expect(
      queryCheckbox(fixture, 'analytics-consent-dialog-toggle').checked,
    ).toBe(false);
  });

  it('hides the analytics consent banner for returning granted consent', () => {
    localStorage.setItem('gx.analyticsConsent.v1', 'granted');

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-banner"]',
      ),
    ).toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-settings')).not.toBeNull();
  });

  it('hides the analytics consent banner for returning denied consent', () => {
    localStorage.setItem('gx.analyticsConsent.v1', 'denied');

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-banner"]',
      ),
    ).toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-settings')).not.toBeNull();
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
  });

  it('persists declined analytics consent without loading GTM', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-decline"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('denied');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-banner"]',
      ),
    ).toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-settings')).not.toBeNull();
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
  });

  it('persists accepted analytics consent and loads GTM from the UI grant flow', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-accept"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('granted');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-banner"]',
      ),
    ).toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-settings')).not.toBeNull();
    expect(
      document.querySelector('script[id^="gx-gtm-script-"]'),
    ).not.toBeNull();
    expect(window.dataLayer).toContainEqual({
      event: 'page_view',
      page_path_normalized: '/',
      play_context: 'hosted',
      route_group: 'lobby',
    });
  });

  it('tracks page views from router navigation after analytics is granted', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="analytics-consent-accept"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    await router.navigateByUrl('/privacy');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'page_view',
        page_path_normalized: '/privacy',
        route_group: 'privacy',
      }),
    );
  });

  it('cancels the banner preferences dialog without persisting consent', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    queryButton(fixture, 'analytics-consent-privacy-link').click();
    fixture.detectChanges();
    queryCheckbox(fixture, 'analytics-consent-dialog-toggle').click();
    fixture.detectChanges();
    queryButton(fixture, 'analytics-consent-dialog-cancel').click();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-dialog')).toBeNull();
  });

  it('dismisses the preferences dialog without persisting consent', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    queryButton(fixture, 'analytics-consent-privacy-link').click();
    fixture.detectChanges();
    queryCheckbox(fixture, 'analytics-consent-dialog-toggle').click();
    (
      fixture.componentInstance as unknown as {
        onConsentDialogVisibleChange(visible: boolean): void;
      }
    ).onConsentDialogVisibleChange(false);
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBeNull();
    expect(queryByTestId(fixture, 'analytics-consent-dialog')).toBeNull();
  });

  it('confirms granted analytics from the banner dialog and returns home', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/privacy');
    await fixture.whenStable();
    fixture.detectChanges();

    queryButton(fixture, 'analytics-consent-privacy-link').click();
    fixture.detectChanges();
    queryCheckbox(fixture, 'analytics-consent-dialog-toggle').click();
    fixture.detectChanges();
    queryButton(fixture, 'analytics-consent-dialog-confirm').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('granted');
    expect(router.url).toBe('/');
    expect(
      document.querySelector('script[id^="gx-gtm-script-"]'),
    ).not.toBeNull();
    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'page_view',
        page_path_normalized: '/privacy',
        route_group: 'privacy',
      }),
    );
  });

  it('confirms denied analytics from the banner dialog and returns home', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/privacy');
    await fixture.whenStable();
    fixture.detectChanges();

    queryButton(fixture, 'analytics-consent-privacy-link').click();
    fixture.detectChanges();
    queryButton(fixture, 'analytics-consent-dialog-confirm').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('denied');
    expect(router.url).toBe('/');
    expect(document.querySelector('script[id^="gx-gtm-script-"]')).toBeNull();
  });

  it('opens the launcher dialog with returning consent and saves in place', async () => {
    localStorage.setItem('gx.analyticsConsent.v1', 'granted');
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/privacy');
    await fixture.whenStable();
    fixture.detectChanges();

    queryButton(fixture, 'analytics-consent-settings').click();
    fixture.detectChanges();

    const toggle = queryCheckbox(fixture, 'analytics-consent-dialog-toggle');
    expect(toggle.checked).toBe(true);

    toggle.click();
    fixture.detectChanges();
    queryButton(fixture, 'analytics-consent-dialog-confirm').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('denied');
    expect(router.url).toBe('/privacy');
  });

  it('opens the launcher dialog with denied consent and can grant in place', async () => {
    localStorage.setItem('gx.analyticsConsent.v1', 'denied');
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/privacy');
    await fixture.whenStable();
    fixture.detectChanges();

    queryButton(fixture, 'analytics-consent-settings').click();
    fixture.detectChanges();

    const toggle = queryCheckbox(fixture, 'analytics-consent-dialog-toggle');
    expect(toggle.checked).toBe(false);

    toggle.click();
    fixture.detectChanges();
    queryButton(fixture, 'analytics-consent-dialog-confirm').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(localStorage.getItem('gx.analyticsConsent.v1')).toBe('granted');
    expect(router.url).toBe('/privacy');
    expect(
      document.querySelector('script[id^="gx-gtm-script-"]'),
    ).not.toBeNull();
  });

  it('renders the active lobby route content', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Lobby page');
    expect(document.title).toBe('gx.go | Online Go and Gomoku Rooms');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/?locale=en');
  });

  it('falls back to default metadata for routes without goSeo data', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/online/room/ROOM42');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Room page');
    expect(document.title).toBe('gx.go | Online Go and Gomoku Rooms');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe(
      'https://gxgo.synology.me/online/room/ROOM42?locale=en',
    );
  });
});

function metaName(name: string): string | null {
  return (
    document.head
      .querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      ?.getAttribute('content') ?? null
  );
}

function canonicalHref(): string | null {
  return (
    document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.getAttribute('href') ?? null
  );
}

function queryByTestId<T extends HTMLElement>(
  fixture: ComponentFixture<AppComponent>,
  testId: string,
): T | null {
  const selector = `[data-testid="${testId}"]`;

  return (
    fixture.nativeElement.querySelector(selector) ??
    document.body.querySelector(selector)
  );
}

function queryButton(
  fixture: ComponentFixture<AppComponent>,
  testId: string,
): HTMLButtonElement {
  const button = queryByTestId<HTMLButtonElement>(fixture, testId);

  if (!button) {
    throw new Error(`Expected ${testId} button to exist.`);
  }

  return button;
}

function queryCheckbox(
  fixture: ComponentFixture<AppComponent>,
  testId: string,
): HTMLInputElement {
  const input = queryByTestId<HTMLInputElement>(fixture, testId);

  if (!input) {
    throw new Error(`Expected ${testId} checkbox to exist.`);
  }

  return input;
}
