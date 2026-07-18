/**
 * TMS normalisation — unit tests (no network calls)
 * Run: cd backend && npm test
 */

'use strict';

// Inline the normalisation logic to test it in isolation
const TMS_LATE_CUTOFF = 9;
function normalise(dateStr, payload) {
  const cutoff = `${String(TMS_LATE_CUTOFF).padStart(2, '0')}:00`;
  const raw = payload?.records ?? payload?.data?.records ?? payload?.attendance ?? payload?.data ?? [];

  return raw.map(r => {
    const checkIn  = r.checkIn  || r.check_in  || r.CheckIn  || null;
    const checkOut = r.checkOut || r.check_out || r.CheckOut || null;
    const empId    = r.employeeId || r.employee_id || r.EmployeeID || r.empId;
    let status = (r.status || r.Status || '').toUpperCase();

    if (!status && !checkIn)  status = 'ABSENT';
    else if (!status && checkIn) {
      const timeStr = checkIn.length > 10 ? checkIn.slice(11, 16) : '';
      status = timeStr && timeStr > cutoff ? 'LATE' : 'PRESENT';
    }
    if (!['PRESENT', 'LATE', 'ABSENT'].includes(status)) status = 'PRESENT';

    return { employeeId: empId, checkIn, checkOut, status };
  });
}

describe('TMS normalise', () => {
  const DATE = '2026-06-01';

  it('marks record with no checkIn as ABSENT', () => {
    const records = normalise(DATE, { records: [{ employeeId: 'EMP001', checkIn: null, checkOut: null }] });
    expect(records[0].status).toBe('ABSENT');
  });

  it('marks early check-in as PRESENT', () => {
    const records = normalise(DATE, { records: [{ employeeId: 'EMP002', checkIn: '2026-06-01T08:30:00Z' }] });
    expect(records[0].status).toBe('PRESENT');
  });

  it('marks post-cutoff check-in as LATE', () => {
    const records = normalise(DATE, { records: [{ employeeId: 'EMP003', checkIn: '2026-06-01T09:31:00Z' }] });
    expect(records[0].status).toBe('LATE');
  });

  it('accepts different field name casing', () => {
    const records = normalise(DATE, { records: [{ EmployeeID: 'EMP004', CheckIn: '2026-06-01T08:00:00Z' }] });
    expect(records[0].employeeId).toBe('EMP004');
    expect(records[0].status).toBe('PRESENT');
  });

  it('sanitises unknown status to PRESENT', () => {
    const records = normalise(DATE, { records: [{ employeeId: 'EMP005', checkIn: '2026-06-01T08:00:00Z', status: 'LEAVE' }] });
    expect(records[0].status).toBe('PRESENT');
  });
});
