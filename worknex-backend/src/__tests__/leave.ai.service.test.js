/**
 * AI Leave Advisor — leave.ai.service.js
 *
 * Verifies: the advisor never throws, respects the aiLeaveAdvisorEnabled
 * toggle, saves a valid recommendation, discards a malformed one, survives
 * AI-service failures, and that the recommendation is hidden from the
 * employee but visible to manager/admin. Requires a real database — run
 * with RUN_DB_TESTS=true.
 */

jest.mock('axios');
const axios = require('axios');
const prisma = require('../config/db');
const leaveAiService = require('../modules/leave/leave.ai.service');
const leaveService = require('../modules/leave/leave.service');

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

const pickWeekdayIso = (offsetDays) => {
  const base = new Date();
  for (let i = offsetDays; i < offsetDays + 14; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dow = new Date(str).getDay();
    if (dow >= 1 && dow <= 5) return str;
  }
  throw new Error('Could not find a weekday in range');
};

const VALID_AI_RESPONSE = {
  recommendation: 'APPROVE',
  confidence: 88,
  reasoning: ['Sufficient leave balance', 'Excellent attendance'],
  policyObservations: ['Sandwich rule not triggered'],
  model: 'llama3-8b-8192',
};

describeDatabase('AI leave advisor', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let organization;
  let managerRole;
  let employeeRole;
  let manager;
  let employee;
  let policy;

  beforeAll(async () => {
    organization = await prisma.organization.create({
      data: { name: `AI Advisor Test ${suffix}`, slug: `ai-advisor-${suffix}` },
    });
    managerRole = await prisma.role.create({
      data: { organizationId: organization.id, name: `Manager ${suffix}`, tier: 'MANAGER', permissions: [], isSystem: true },
    });
    employeeRole = await prisma.role.create({
      data: { organizationId: organization.id, name: `Employee ${suffix}`, tier: 'EMPLOYEE', permissions: [], isSystem: true },
    });
    manager = await prisma.user.create({
      data: {
        organizationId: organization.id, employeeId: `AI-MGR-${suffix}`, firstName: 'Mona', lastName: 'Manager',
        email: `ai-mona-${suffix}@example.test`, passwordHash: 'x', roleId: managerRole.id,
      },
    });
    employee = await prisma.user.create({
      data: {
        organizationId: organization.id, employeeId: `AI-EMP-${suffix}`, firstName: 'Ed', lastName: 'Employee',
        email: `ai-ed-${suffix}@example.test`, passwordHash: 'x', roleId: employeeRole.id, managerId: manager.id,
      },
    });
    policy = await prisma.leavePolicy.create({
      data: { organizationId: organization.id, leaveType: 'CASUAL', totalDays: 10, applicableRoleIds: [employeeRole.id, managerRole.id] },
    });
    await prisma.leaveBalance.create({
      data: { organizationId: organization.id, userId: employee.id, policyId: policy.id, year: new Date().getFullYear(), totalDays: 10, usedDays: 0, remainingDays: 10 },
    });
  });

  afterAll(async () => {
    await prisma.leaveRequest.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.leaveBalance.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.leavePolicy.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.organizationSettings.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.role.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  beforeEach(() => {
    axios.post.mockReset();
  });

  const createLeave = async (dayOffset) => {
    const date = pickWeekdayIso(dayOffset);
    return prisma.leaveRequest.create({
      data: {
        organizationId: organization.id, employeeId: employee.id, approverId: manager.id,
        leaveType: 'CASUAL', balanceLeaveType: 'CASUAL', startDate: new Date(date), endDate: new Date(date),
        totalDays: 1, reason: 'AI advisor test',
      },
      include: { employee: { select: { managerId: true, department: true } } },
    });
  };

  const setAiEnabled = (enabled) => prisma.organizationSettings.upsert({
    where: { organizationId: organization.id },
    update: { aiLeaveAdvisorEnabled: enabled },
    create: { organizationId: organization.id, aiLeaveAdvisorEnabled: enabled },
  });

  test('AI enabled + valid response: recommendation fields are saved', async () => {
    await setAiEnabled(true);
    axios.post.mockResolvedValueOnce({ data: VALID_AI_RESPONSE });
    const leave = await createLeave(40);

    const result = await leaveAiService.generateRecommendation(leave, { employee, organizationId: organization.id });

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(result.aiRecommendation).toBe('APPROVE');
    expect(result.aiConfidence).toBe(88);
    expect(result.aiModel).toBe('llama3-8b-8192');

    const saved = await prisma.leaveRequest.findUnique({ where: { id: leave.id } });
    expect(saved.aiRecommendation).toBe('APPROVE');
    expect(saved.aiGeneratedAt).not.toBeNull();
  });

  test('AI disabled: axios is never called, leave is unchanged', async () => {
    await setAiEnabled(false);
    const leave = await createLeave(60);

    const result = await leaveAiService.generateRecommendation(leave, { employee, organizationId: organization.id });

    expect(axios.post).not.toHaveBeenCalled();
    expect(result.aiRecommendation).toBeNull();
    const saved = await prisma.leaveRequest.findUnique({ where: { id: leave.id } });
    expect(saved.aiRecommendation).toBeNull();
  });

  test('AI service timeout/network error: leave unchanged, function does not throw', async () => {
    await setAiEnabled(true);
    axios.post.mockRejectedValueOnce(Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' }));
    const leave = await createLeave(80);

    await expect(leaveAiService.generateRecommendation(leave, { employee, organizationId: organization.id }))
      .resolves.toMatchObject({ id: leave.id, aiRecommendation: null });

    const saved = await prisma.leaveRequest.findUnique({ where: { id: leave.id } });
    expect(saved.aiRecommendation).toBeNull();
  });

  test('malformed AI response (invalid enum / out-of-range confidence): leave unchanged, no throw', async () => {
    await setAiEnabled(true);
    axios.post.mockResolvedValueOnce({ data: { recommendation: 'MAYBE', confidence: 150, reasoning: 'not an array' } });
    const leave = await createLeave(100);

    const result = await leaveAiService.generateRecommendation(leave, { employee, organizationId: organization.id });

    expect(result.aiRecommendation).toBeNull();
    const saved = await prisma.leaveRequest.findUnique({ where: { id: leave.id } });
    expect(saved.aiRecommendation).toBeNull();
  });

  test('recommendation is hidden from the employee but visible to manager/admin', async () => {
    await setAiEnabled(true);
    axios.post.mockResolvedValueOnce({ data: VALID_AI_RESPONSE });
    const leave = await createLeave(120);
    await leaveAiService.generateRecommendation(leave, { employee, organizationId: organization.id });

    const asEmployee = await leaveService.getLeaveById(leave.id, { id: employee.id, organizationId: organization.id, role: 'EMPLOYEE' });
    expect(asEmployee.aiRecommendation).toBeUndefined();
    expect(asEmployee.aiConfidence).toBeUndefined();
    expect(asEmployee.aiReasoning).toBeUndefined();

    const asManager = await leaveService.getLeaveById(leave.id, { id: manager.id, organizationId: organization.id, role: 'MANAGER' });
    expect(asManager.aiRecommendation).toBe('APPROVE');
    expect(asManager.aiReasoning).toEqual(VALID_AI_RESPONSE.reasoning);
  });

  test('AI advisor never influences the approval workflow status', async () => {
    axios.post.mockResolvedValue({ data: VALID_AI_RESPONSE });

    await setAiEnabled(false);
    const withoutAi = await leaveService.applyLeave({ id: employee.id, organizationId: organization.id }, {
      leaveType: 'CASUAL', startDate: pickWeekdayIso(140), endDate: pickWeekdayIso(140), reason: 'AI off',
    });

    await setAiEnabled(true);
    const withAi = await leaveService.applyLeave({ id: employee.id, organizationId: organization.id }, {
      leaveType: 'CASUAL', startDate: pickWeekdayIso(160), endDate: pickWeekdayIso(160), reason: 'AI on',
    });

    expect(withoutAi.status).toBe(withAi.status);
    expect(withAi.aiRecommendation).toBe('APPROVE');
    expect(withoutAi.aiRecommendation).toBeNull();
  });
});
