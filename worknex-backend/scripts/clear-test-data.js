const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('🗑️  Starting to clear test data...\n');

  try {
    // Delete in reverse order of dependencies
    console.log('Deleting performance records...');
    await prisma.performanceRecord.deleteMany({});
    
    console.log('Deleting leave requests...');
    await prisma.leaveRequest.deleteMany({});
    
    console.log('Deleting leave balances...');
    await prisma.leaveBalance.deleteMany({});
    
    console.log('Deleting leave policies...');
    await prisma.leavePolicy.deleteMany({});
    
    console.log('Deleting attendance records...');
    await prisma.attendance.deleteMany({});
    
    console.log('Deleting notifications...');
    await prisma.notification.deleteMany({});
    
    console.log('Deleting users...');
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@worknex.com'
        }
      }
    });
    
    console.log('Deleting departments...');
    await prisma.department.deleteMany({});
    
    console.log('\n✅ Test data cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
