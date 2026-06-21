const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper function to generate random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random time
function randomTime(baseDate, startHour, endHour) {
  const date = new Date(baseDate);
  const hour = startHour + Math.random() * (endHour - startHour);
  date.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), 0, 0);
  return date;
}

async function seedTestData() {
  console.log('🌱 Starting to seed test data...\n');

  try {
    // Get or create departments
    console.log('📁 Creating departments...');
    const departments = await Promise.all([
      prisma.department.upsert({
        where: { name: 'Engineering' },
        update: {},
        create: { name: 'Engineering', description: 'Software Development' }
      }),
      prisma.department.upsert({
        where: { name: 'Marketing' },
        update: {},
        create: { name: 'Marketing', description: 'Marketing and Sales' }
      }),
      prisma.department.upsert({
        where: { name: 'HR' },
        update: {},
        create: { name: 'HR', description: 'Human Resources' }
      }),
      prisma.department.upsert({
        where: { name: 'Finance' },
        update: {},
        create: { name: 'Finance', description: 'Finance and Accounting' }
      }),
      prisma.department.upsert({
        where: { name: 'Operations' },
        update: {},
        create: { name: 'Operations', description: 'Operations Management' }
      })
    ]);
    console.log(`✅ Created ${departments.length} departments\n`);

    // Create managers (one per department)
    console.log('👔 Creating managers...');
    const managerPassword = await bcrypt.hash('manager123', 12);
    const managers = [];
    
    for (let i = 0; i < departments.length; i++) {
      const manager = await prisma.user.upsert({
        where: { email: `manager${i + 1}@worknex.com` },
        update: {},
        create: {
          email: `manager${i + 1}@worknex.com`,
          passwordHash: managerPassword,
          firstName: ['Ali', 'Sarah', 'Ahmed', 'Fatima', 'Hassan'][i],
          lastName: ['Khan', 'Ahmed', 'Ali', 'Hassan', 'Malik'][i],
          employeeId: `MGR-${1000 + i}`,
          role: 'MANAGER',
          departmentId: departments[i].id,
          designation: 'Department Manager',
          phone: `+9230${8000000 + i}`,
          joiningDate: new Date('2020-01-01'),
          isActive: true
        }
      });
      managers.push(manager);
    }
    console.log(`✅ Created ${managers.length} managers\n`);

    // Create employees (10 per manager = 50 total)
    console.log('👥 Creating employees...');
    const employeePassword = await bcrypt.hash('employee123', 12);
    const employees = [];
    
    const firstNames = ['Usman', 'Ayesha', 'Bilal', 'Zainab', 'Imran', 'Hira', 'Kamran', 'Sana', 'Faisal', 'Nida'];
    const lastNames = ['Sheikh', 'Iqbal', 'Raza', 'Siddiqui', 'Hussain', 'Malik', 'Butt', 'Chaudhry', 'Mirza', 'Qureshi'];
    
    for (let m = 0; m < managers.length; m++) {
      for (let e = 0; e < 10; e++) {
        const empIndex = m * 10 + e;
        const email = `employee${empIndex + 1}@worknex.com`;
        const employeeId = `EMP-${2000 + empIndex}`;
        
        // Check if employee already exists
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: email },
              { employeeId: employeeId }
            ]
          }
        });
        
        if (existing) {
          console.log(`  Skipping ${email} - already exists`);
          employees.push(existing);
          continue;
        }
        
        const employee = await prisma.user.create({
          data: {
            email: email,
            passwordHash: employeePassword,
            firstName: firstNames[e],
            lastName: lastNames[e],
            employeeId: employeeId,
            role: 'EMPLOYEE',
            departmentId: departments[m].id,
            managerId: managers[m].id,
            designation: ['Developer', 'Designer', 'Analyst', 'Specialist', 'Coordinator'][e % 5],
            phone: `+9230${9000000 + empIndex}`,
            joiningDate: randomDate(new Date('2021-01-01'), new Date('2024-01-01')),
            isActive: true
          }
        });
        employees.push(employee);
      }
    }
    console.log(`✅ Created ${employees.length} employees\n`);

    // Create attendance records (last 90 days for all employees)
    console.log('📅 Creating attendance records...');
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    let attendanceCount = 0;
    const allUsers = [...managers, ...employees];
    
    for (const user of allUsers) {
      for (let d = 0; d < 90; d++) {
        const date = new Date(ninetyDaysAgo);
        date.setDate(date.getDate() + d);
        date.setHours(0, 0, 0, 0);
        
        // Skip weekends (Saturday = 6, Sunday = 0)
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // 95% attendance rate
        if (Math.random() > 0.95) continue;
        
        // Check if attendance already exists
        const existing = await prisma.attendance.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: date
            }
          }
        });
        
        if (existing) {
          attendanceCount++;
          continue;
        }
        
        // Random check-in time (8:00 AM - 9:30 AM)
        const checkIn = randomTime(date, 8, 9.5);
        
        // Random check-out time (5:00 PM - 7:00 PM)
        const checkOut = randomTime(date, 17, 19);
        
        // Calculate working hours
        const workingHours = (checkOut - checkIn) / (1000 * 60 * 60);
        
        // Determine status
        let status = 'PRESENT';
        if (checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 30)) {
          status = 'LATE';
        }
        if (workingHours < 4) {
          status = 'HALF_DAY';
        }
        
        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: date,
            checkIn: checkIn,
            checkOut: checkOut,
            workingHours: parseFloat(workingHours.toFixed(2)),
            status: status,
            source: 'MANUAL'
          }
        });
        attendanceCount++;
      }
    }
    console.log(`✅ Created ${attendanceCount} attendance records\n`);

    // Create leave policies
    console.log('📋 Creating leave policies...');
    const leavePolicies = [];
    
    const policyData = [
      { leaveType: 'ANNUAL', totalDays: 20, description: 'Annual Leave' },
      { leaveType: 'SICK', totalDays: 10, description: 'Sick Leave' },
      { leaveType: 'CASUAL', totalDays: 10, description: 'Casual Leave' }
    ];
    
    for (const policy of policyData) {
      const existing = await prisma.leavePolicy.findFirst({
        where: { leaveType: policy.leaveType }
      });
      
      if (existing) {
        leavePolicies.push(existing);
      } else {
        const created = await prisma.leavePolicy.create({
          data: policy
        });
        leavePolicies.push(created);
      }
    }
    console.log(`✅ Created ${leavePolicies.length} leave policies\n`);

    // Create leave balances for all users
    console.log('💰 Creating leave balances...');
    const currentYear = new Date().getFullYear();
    let balanceCount = 0;
    
    for (const user of allUsers) {
      for (const policy of leavePolicies) {
        const usedDays = Math.floor(Math.random() * 5);
        await prisma.leaveBalance.create({
          data: {
            userId: user.id,
            policyId: policy.id,
            year: currentYear,
            totalDays: policy.totalDays,
            usedDays: usedDays,
            remainingDays: policy.totalDays - usedDays
          }
        });
        balanceCount++;
      }
    }
    console.log(`✅ Created ${balanceCount} leave balances\n`);

    // Create leave requests
    console.log('🏖️ Creating leave requests...');
    const leaveTypes = ['ANNUAL', 'SICK', 'CASUAL'];
    const leaveStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    let leaveCount = 0;
    
    for (const employee of employees) {
      // Create 3-5 leave requests per employee
      const numLeaves = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < numLeaves; i++) {
        const startDate = randomDate(ninetyDaysAgo, today);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);
        
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];
        
        await prisma.leaveRequest.create({
          data: {
            employeeId: employee.id,
            approverId: employee.managerId,
            leaveType: leaveType,
            startDate: startDate,
            endDate: endDate,
            totalDays: totalDays,
            reason: `${leaveType} leave request`,
            status: status,
            appliedAt: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            reviewedAt: status !== 'PENDING' ? new Date(startDate.getTime() - 5 * 24 * 60 * 60 * 1000) : null
          }
        });
        leaveCount++;
      }
    }
    console.log(`✅ Created ${leaveCount} leave requests\n`);

    // Create performance records
    console.log('📊 Creating performance records...');
    let performanceCount = 0;
    
    for (const employee of employees) {
      // Create monthly performance records for the last 6 months
      for (let m = 0; m < 6; m++) {
        const recordDate = new Date();
        recordDate.setMonth(recordDate.getMonth() - m);
        
        const month = recordDate.getMonth() + 1;
        const year = recordDate.getFullYear();
        
        // Generate realistic performance data
        const presentDays = 18 + Math.floor(Math.random() * 5); // 18-22 days
        const absentDays = Math.floor(Math.random() * 2); // 0-1 days
        const lateDays = Math.floor(Math.random() * 3); // 0-2 days
        const leaveDays = Math.floor(Math.random() * 3); // 0-2 days
        const avgWorkingHours = 7.5 + Math.random() * 1.5; // 7.5-9 hours
        const attendanceScore = 70 + Math.random() * 30; // 70-100
        const leaveScore = 80 + Math.random() * 20; // 80-100
        const overallScore = (attendanceScore + leaveScore) / 2;
        
        await prisma.performanceRecord.create({
          data: {
            userId: employee.id,
            month: month,
            year: year,
            presentDays: presentDays,
            absentDays: absentDays,
            lateDays: lateDays,
            leaveDays: leaveDays,
            avgWorkingHours: parseFloat(avgWorkingHours.toFixed(2)),
            attendanceScore: parseFloat(attendanceScore.toFixed(1)),
            leaveScore: parseFloat(leaveScore.toFixed(1)),
            overallScore: parseFloat(overallScore.toFixed(1)),
            createdAt: recordDate
          }
        });
        performanceCount++;
      }
    }
    console.log(`✅ Created ${performanceCount} performance records\n`);

    console.log('✨ Test data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Managers: ${managers.length}`);
    console.log(`   - Employees: ${employees.length}`);
    console.log(`   - Attendance Records: ${attendanceCount}`);
    console.log(`   - Leave Policies: ${leavePolicies.length}`);
    console.log(`   - Leave Balances: ${balanceCount}`);
    console.log(`   - Leave Requests: ${leaveCount}`);
    console.log(`   - Performance Reviews: ${performanceCount}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Manager: manager1@worknex.com / manager123');
    console.log('   Employee: employee1@worknex.com / employee123');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
