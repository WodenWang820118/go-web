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
  });

  it('renders the active room route content', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);

    await router.navigateByUrl('/online/room/ROOM42');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Room page');
  });
});
