import {
  RETURN_CHECKLIST_STATUSES,
  toReturnChecklistStatus,
} from './ReturnChecklist';

describe('RETURN_CHECKLIST_STATUSES', () => {
  test('is frozen and complete', () => {
    expect(Object.isFrozen(RETURN_CHECKLIST_STATUSES)).toBe(true);
    expect([...RETURN_CHECKLIST_STATUSES]).toEqual(['open', 'closed']);
  });
});

describe('toReturnChecklistStatus', () => {
  test.each(['open', 'closed'])('accepts known status %s', (s) => {
    expect(toReturnChecklistStatus(s)).toBe(s);
  });

  test('coerces unknown statuses to "open" (safer default — do not auto-close)', () => {
    expect(toReturnChecklistStatus('pending')).toBe('open');
    expect(toReturnChecklistStatus('archived')).toBe('open');
    expect(toReturnChecklistStatus(undefined)).toBe('open');
    expect(toReturnChecklistStatus(null)).toBe('open');
    expect(toReturnChecklistStatus(42)).toBe('open');
  });
});
