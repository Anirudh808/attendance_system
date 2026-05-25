import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    // Authenticate token
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const staffId = user.staffId;
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Fetch records and count from database using Prisma
    const records = await prisma.attendance.findMany({
      where: { staffId },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.attendance.count({
      where: { staffId },
    });

    // Map database fields to the structure expected by the frontend
    const mappedRecords = records.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: r.staffName,
      timestamp: r.timestamp.toISOString(),
      currentLocation: {
        latitude: r.currentLat,
        longitude: r.currentLon,
        accuracy: r.accuracy,
      },
      workLocation: {
        latitude: r.workLat,
        longitude: r.workLon,
      },
      distanceFromWork: r.distanceFromWork,
      status: r.status,
      remarks: r.remarks,
    }));

    return NextResponse.json({
      records: mappedRecords,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get records error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', message: error.message }, { status: 500 });
  }
}
