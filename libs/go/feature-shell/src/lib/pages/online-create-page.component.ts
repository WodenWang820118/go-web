import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, from, switchMap, take } from 'rxjs';
import { OnlineRoomService } from '../online/online-room.service';

@Component({
  selector: 'lib-go-online-create-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <a
        routerLink="/"
        class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500 transition hover:text-stone-900"
      >
        <span class="text-lg">&larr;</span>
        Back to modes
      </a>

      <div class="mt-8 rounded-[2rem] border border-slate-900/5 bg-white/90 p-8 shadow-2xl shadow-slate-950/10">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Hosted multiplayer
        </p>
        <h1 class="mt-3 text-4xl font-semibold text-stone-950">
          Create an online room
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
          You will become the host, get a shareable room URL, and can invite two
          players plus any number of spectators.
        </p>

        @if (onlineRoom.lastError()) {
          <div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ onlineRoom.lastError() }}
          </div>
        }

        <form
          class="mt-8 space-y-6"
          data-testid="create-room-form"
          [formGroup]="form"
          (ngSubmit)="createRoom()"
        >
          <label class="block space-y-2 text-sm font-medium text-stone-700">
            <span>Your display name</span>
            <input
              formControlName="displayName"
              class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-400 focus:bg-white"
              maxlength="24"
            />
          </label>

          <button
            type="submit"
            class="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="onlineRoom.creating()"
          >
            {{ onlineRoom.creating() ? 'Creating room...' : 'Create room' }}
          </button>
        </form>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineCreatePageComponent {
  protected readonly onlineRoom = inject(OnlineRoomService);

  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    displayName: new FormControl(this.onlineRoom.displayName() || 'Host', {
      nonNullable: true,
    }),
  });

  protected createRoom(): void {
    this.onlineRoom
      .createRoom(this.form.controls.displayName.value)
      .pipe(
        switchMap(response => from(this.router.navigate(['/online/room', response.roomId]))),
        catchError(() => EMPTY),
        take(1)
      )
      .subscribe();
  }
}
