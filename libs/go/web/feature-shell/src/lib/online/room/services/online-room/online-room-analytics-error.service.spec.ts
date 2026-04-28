import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { OnlineRoomAnalyticsErrorService } from './online-room-analytics-error.service';

describe('OnlineRoomAnalyticsErrorService', () => {
  let service: OnlineRoomAnalyticsErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OnlineRoomAnalyticsErrorService],
    });

    service = TestBed.inject(OnlineRoomAnalyticsErrorService);
  });

  it('classifies not-found room errors for analytics', () => {
    expect(service.describe(new HttpErrorResponse({ status: 404 }))).toBe(
      'not_found',
    );
  });

  it('classifies offline network errors for analytics', () => {
    expect(service.describe(new HttpErrorResponse({ status: 0 }))).toBe(
      'network',
    );
  });

  it('classifies unknown errors as unexpected', () => {
    expect(service.describe(new Error('boom'))).toBe('unexpected');
  });

  it('classifies missing error values as unexpected', () => {
    expect(service.describe(null)).toBe('unexpected');
    expect(service.describe(undefined)).toBe('unexpected');
  });

  it('classifies unrecognised HTTP errors as unexpected', () => {
    expect(service.describe(new HttpErrorResponse({ status: 500 }))).toBe(
      'unexpected',
    );
  });
});
