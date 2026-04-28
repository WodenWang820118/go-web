import { TestBed } from '@angular/core/testing';
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
    document.title = '';
    document.head
      .querySelectorAll('meta[name], meta[property], link[rel="canonical"]')
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
    expect(
      (
        fixture.nativeElement.querySelector(
          '[data-testid="analytics-consent-privacy-link"]',
        ) as HTMLAnchorElement
      ).getAttribute('href'),
    ).toBe('/privacy');
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

  it('renders the active lobby route content', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Lobby page');
    expect(document.title).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/');
  });

  it('falls back to default metadata for routes without goSeo data', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/online/room/ROOM42');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Room page');
    expect(document.title).toBe('gx.go｜線上圍棋與五子棋房間');
    expect(metaName('robots')).toBe('index,follow');
    expect(canonicalHref()).toBe('https://gxgo.synology.me/online/room/ROOM42');
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
