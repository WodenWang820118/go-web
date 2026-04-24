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

describe('AppComponent', () => {
  beforeEach(async () => {
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
        ]),
      ],
    }).compileComponents();
  });

  it('creates the root shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
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
