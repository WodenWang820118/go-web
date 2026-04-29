import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_GO_TIME_CONTROL } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { vi } from 'vitest';
import { TimeControlPresetSelectorComponent } from './time-control-preset-selector.component';

describe('TimeControlPresetSelectorComponent', () => {
  let fixture: ComponentFixture<TimeControlPresetSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeControlPresetSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeControlPresetSelectorComponent);
    TestBed.inject(GoI18nService).setLocale('zh-TW');
    fixture.componentRef.setInput('selected', DEFAULT_GO_TIME_CONTROL);
    fixture.detectChanges();
  });

  it('groups official Go presets by time-control system', () => {
    const root = fixture.nativeElement as HTMLElement;
    const groupLabels = Array.from(root.querySelectorAll('optgroup')).map(
      (group) => group.getAttribute('label'),
    );

    expect(groupLabels).toEqual(['讀秒', 'Fischer 加秒', '加拿大讀秒', '包干']);
    expect(root.textContent).toContain('30 分 + 3 次 30 秒 讀秒');
  });

  it('emits the selected preset as concrete time-control settings', () => {
    const emit = vi.spyOn(fixture.componentInstance.selectionChange, 'emit');
    const select = fixture.nativeElement.querySelector(
      '[data-testid="time-control-preset-select"]',
    ) as HTMLSelectElement;

    select.value = 'aga-open-fischer-60-20';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(emit).toHaveBeenCalledWith({
      type: 'fischer',
      mainTimeMs: 3_600_000,
      incrementMs: 20_000,
    });
  });
});
