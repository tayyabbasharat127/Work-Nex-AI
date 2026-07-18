const { leaveWorkflowEmail, userWelcomeEmail } = require('../utils/emailTemplates');

describe('leave workflow email template', () => {
  const input = {
    recipientName: 'Ali <script>alert(1)</script>',
    headline: 'Leave approved\r\nBcc: attacker@example.com',
    message: 'Your request is approved.',
    status: 'approved',
    statusLabel: 'Finally approved',
    employeeName: 'Ali Khan',
    leaveType: 'Annual Leave',
    startDate: '2026-07-20',
    endDate: '2026-07-22',
    totalDays: 3,
    reason: 'Family <b>event</b>',
    note: 'Enjoy <img src=x onerror=alert(1)>',
    actionLabel: 'View leave',
    actionUrl: 'https://worknex.example/dashboard/employee/leaves',
  };

  it('renders branded leave details and escapes user-provided HTML', () => {
    const email = leaveWorkflowEmail(input);

    expect(email.html).toContain('WorkNex AI');
    expect(email.html).toContain('Finally approved');
    expect(email.html).toContain('Annual Leave');
    expect(email.html).toContain('3 days');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('Family &lt;b&gt;event&lt;/b&gt;');
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).not.toContain('<img src=x');
  });

  it('sanitizes the subject and rejects unsafe action protocols', () => {
    const email = leaveWorkflowEmail({ ...input, actionUrl: 'javascript:alert(1)' });

    expect(email.subject).toBe('Leave approved Bcc: attacker@example.com');
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.html).not.toContain('javascript:alert(1)');
  });
});

describe('new user welcome email template', () => {
  it('renders the exact initial credentials and account context', () => {
    const email = userWelcomeEmail({
      firstName: 'Rana',
      organizationName: 'DHA Suffa University',
      email: 'rana@example.com',
      initialPassword: 'Correct<&Password1!',
      employeeId: 'DSU-1001',
      roleName: 'Employee',
      departmentName: 'Computer Science',
      loginUrl: 'https://worknex.example/login',
      passwordWasGenerated: false,
    });

    expect(email.subject).toBe('Welcome to WorkNex AI - DHA Suffa University account ready');
    expect(email.html).toContain('Rana');
    expect(email.html).toContain('DSU-1001');
    expect(email.html).toContain('Computer Science');
    expect(email.html).toContain('Correct&lt;&amp;Password1!');
    expect(email.html).not.toContain('Correct<&Password1!');
    expect(email.html).toContain('https://worknex.example/login');
  });

  it('does not render an unsafe login URL', () => {
    const email = userWelcomeEmail({
      firstName: 'User',
      organizationName: 'Example Org',
      email: 'user@example.com',
      initialPassword: 'Password1!',
      employeeId: 'EMP-1',
      roleName: 'Employee',
      loginUrl: 'javascript:alert(1)',
      passwordWasGenerated: true,
    });

    expect(email.html).toContain('Temporary password');
    expect(email.html).not.toContain('javascript:alert(1)');
  });
});
