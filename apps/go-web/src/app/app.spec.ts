import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

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

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
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
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the active lobby route content', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Lobby page');
  });

  it('renders the active room route content', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/online/room/ROOM42');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Room page');
  });
});
