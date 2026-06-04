import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * POST handler to create a new work location for a staff member.
 * Access restricted to ADMIN role.
 */
export async function POST(request) {
  try {
    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { userId, name, workLat, workLon } = body;

    // Validate inputs
    if (!userId || !name || workLat === undefined || workLon === undefined) {
      return NextResponse.json({ error: 'Missing required fields (userId, name, workLat, workLon)' }, { status: 400 });
    }

    const cleanUserId = userId.toString().trim();
    const cleanName = name.toString().trim();
    const parsedLat = parseFloat(workLat);
    const parsedLon = parseFloat(workLon);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    if (!cleanName) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    // Verify staff member exists
    const staffExists = await prisma.staff.findUnique({ where: { id: cleanUserId } });
    if (!staffExists) {
      return NextResponse.json({ error: 'Target staff member not found' }, { status: 404 });
    }

    // Create Work Location
    const newLocation = await prisma.workLocation.create({
      data: {
        userId: cleanUserId,
        name: cleanName,
        workLat: parsedLat,
        workLon: parsedLon
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Work location added successfully',
      location: newLocation
    }, { status: 201 });
  } catch (error) {
    console.error('Admin create work location error:', error);
    return NextResponse.json({ error: 'Failed to create work location', message: error.message }, { status: 500 });
  }
}

/**
 * GET handler to return all unique work locations currently stored in the database.
 * Access restricted to ADMIN role.
 */
export async function GET(request) {
  try {
    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const locations = await prisma.workLocation.findMany({
      select: {
        name: true,
        workLat: true,
        workLon: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Unique locations by lowercase name and rounded coordinates
    const uniqueLocationsMap = new Map();
    for (const loc of locations) {
      const latKey = parseFloat(loc.workLat).toFixed(5);
      const lonKey = parseFloat(loc.workLon).toFixed(5);
      const key = `${loc.name.trim().toLowerCase()}_${latKey}_${lonKey}`;
      
      if (!uniqueLocationsMap.has(key)) {
        uniqueLocationsMap.set(key, {
          name: loc.name.trim(),
          workLat: loc.workLat,
          workLon: loc.workLon
        });
      }
    }

    const uniqueLocations = Array.from(uniqueLocationsMap.values());

    return NextResponse.json(uniqueLocations);
  } catch (error) {
    console.error('Admin get unique work locations error:', error);
    return NextResponse.json({ error: 'Failed to fetch work locations', message: error.message }, { status: 500 });
  }
}
