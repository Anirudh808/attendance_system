import { NextResponse } from 'next/server';
import { calculateDistance, isWithinRadius } from '@/lib/geolocation';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ATTENDANCE_RADIUS_METERS = Number(process.env.ATTENDANCE_RADIUS_METERS) || 50;

export async function POST(request) {
  try {
    // Authenticate token
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const staffId = user.staffId;
    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, timestamp, accuracy } = body;

    // Validate input
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Get staff data from PostgreSQL database
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    // Calculate distance from work location
    const workLat = staff.workLat;
    const workLon = staff.workLon;
    
    // Default accuracy to 0 if not provided
    const gpsAccuracy = accuracy || 0;
    const distance = Math.max(0, calculateDistance(latitude, longitude, workLat, workLon) - gpsAccuracy);

    // Check if within work radius
    const isWithinWorkRadius = isWithinRadius(latitude, longitude, workLat, workLon, ATTENDANCE_RADIUS_METERS, gpsAccuracy);

    // Only allow attendance marking if within radius
    if (!isWithinWorkRadius) {
      return NextResponse.json({
        error: 'Attendance not allowed',
        message: `You are ${distance.toFixed(2)}m away from work location. You must be within ${ATTENDANCE_RADIUS_METERS}m to mark attendance.`,
        distance: parseFloat(distance.toFixed(2)),
      }, { status: 400 });
    }

    const recordId = `ATT-${Date.now()}`;
    const dateVal = timestamp ? new Date(timestamp) : new Date();

    // Create attendance record in database
    await prisma.attendance.create({
      data: {
        id: recordId,
        staffId,
        staffName: staff.name,
        timestamp: dateVal,
        currentLat: latitude,
        currentLon: longitude,
        accuracy: gpsAccuracy,
        workLat,
        workLon,
        distanceFromWork: parseFloat(distance.toFixed(2)),
        status: 'PRESENT',
        remarks: 'Within work location radius',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance marked as PRESENT',
      distance: parseFloat(distance.toFixed(2)),
      status: 'PRESENT',
      recordId: recordId,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return NextResponse.json({ error: 'Failed to mark attendance', message: error.message }, { status: 500 });
  }
}
