const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  const dataDir = path.join(__dirname, '../data');

  // Read staff
  let staffList = [];
  try {
    const staffData = await fs.readFile(path.join(dataDir, 'staff.json'), 'utf-8');
    staffList = JSON.parse(staffData);
  } catch (err) {
    console.error('Error reading staff.json:', err.message);
  }

  // Read attendance
  let attendanceList = [];
  try {
    const attendanceData = await fs.readFile(path.join(dataDir, 'attendance.json'), 'utf-8');
    attendanceList = JSON.parse(attendanceData);
  } catch (err) {
    console.error('Error reading attendance.json:', err.message);
  }

  console.log(`Found ${staffList.length} staff members and ${attendanceList.length} attendance records in JSON files.`);

  // Seed staff
  for (const s of staffList) {
    const workLat = Number(s.workLocation?.latitude || 0);
    const workLon = Number(s.workLocation?.longitude || 0);
    const workAddress = s.workLocation?.address || 'Office';

    await prisma.staff.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        email: s.email,
        password: s.password,
        department: s.department,
        workLat,
        workLon,
        workAddress,
      },
      create: {
        id: s.id,
        name: s.name,
        email: s.email,
        password: s.password,
        department: s.department,
        workLat,
        workLon,
        workAddress,
      },
    });
    console.log(`Upserted staff: ${s.name} (${s.id})`);
  }

  // Seed attendance
  for (const r of attendanceList) {
    // Check if staff exists
    const staffExists = await prisma.staff.findUnique({
      where: { id: r.staffId },
    });

    if (!staffExists) {
      console.warn(`Skipping attendance record ${r.id} because staffId ${r.staffId} does not exist.`);
      continue;
    }

    // Parse timestamp
    let dateVal;
    if (!isNaN(r.timestamp)) {
      const numTs = Number(r.timestamp);
      // If it's a 10-digit Unix timestamp (seconds), convert to ms
      if (r.timestamp.toString().length === 10) {
        dateVal = new Date(numTs * 1000);
      } else {
        dateVal = new Date(numTs);
      }
    } else {
      dateVal = new Date(r.timestamp);
    }

    // fallback to now if invalid date
    if (isNaN(dateVal.getTime())) {
      dateVal = new Date();
    }

    const currentLat = Number(r.currentLocation?.latitude || 0);
    const currentLon = Number(r.currentLocation?.longitude || 0);
    const accuracy = Number(r.currentLocation?.accuracy || 0);
    const workLat = Number(r.workLocation?.latitude || 0);
    const workLon = Number(r.workLocation?.longitude || 0);
    const distanceFromWork = Number(r.distanceFromWork || 0);

    await prisma.attendance.upsert({
      where: { id: r.id },
      update: {
        staffId: r.staffId,
        staffName: r.staffName,
        timestamp: dateVal,
        currentLat,
        currentLon,
        accuracy,
        workLat,
        workLon,
        distanceFromWork,
        status: r.status,
        remarks: r.remarks,
      },
      create: {
        id: r.id,
        staffId: r.staffId,
        staffName: r.staffName,
        timestamp: dateVal,
        currentLat,
        currentLon,
        accuracy,
        workLat,
        workLon,
        distanceFromWork,
        status: r.status,
        remarks: r.remarks,
      },
    });
    console.log(`Upserted attendance record: ${r.id} for ${r.staffName}`);
  }

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
