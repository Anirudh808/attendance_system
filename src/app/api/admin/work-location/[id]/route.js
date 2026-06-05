import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * PUT handler to update a work location connection for an employee.
 * Access restricted to ADMIN role.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params; // Old location ID

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

    // Verify staff exists
    const staffExists = await prisma.staff.findUnique({ where: { id: cleanUserId } });
    if (!staffExists) {
      return NextResponse.json({ error: 'Target staff member not found' }, { status: 404 });
    }

    // Verify old location exists
    const oldLocationExists = await prisma.workLocation.findUnique({ where: { id } });
    if (!oldLocationExists) {
      return NextResponse.json({ error: 'Work location not found' }, { status: 404 });
    }

    // 1. Disconnect the old location from this staff member
    await prisma.staff.update({
      where: { id: cleanUserId },
      data: {
        workLocations: {
          disconnect: { id }
        }
      }
    });

    // 2. Find or create the new location
    let newLocation = await prisma.workLocation.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        workLat: parsedLat,
        workLon: parsedLon
      }
    });

    if (!newLocation) {
      newLocation = await prisma.workLocation.create({
        data: {
          name: cleanName,
          workLat: parsedLat,
          workLon: parsedLon
        }
      });
    }

    // 3. Connect the new location to this staff member
    await prisma.staff.update({
      where: { id: cleanUserId },
      data: {
        workLocations: {
          connect: { id: newLocation.id }
        }
      }
    });

    // 4. Clean up the old location if no users are connected to it anymore
    const remainingUsers = await prisma.staff.count({
      where: {
        workLocations: {
          some: { id }
        }
      }
    });

    if (remainingUsers === 0) {
      await prisma.workLocation.delete({ where: { id } });
    }

    return NextResponse.json({
      success: true,
      message: 'Work location updated successfully',
      location: newLocation
    });
  } catch (error) {
    console.error('Admin update work location error:', error);
    return NextResponse.json({ error: 'Failed to update work location', message: error.message }, { status: 500 });
  }
}

/**
 * DELETE handler to remove a work location mapping from a user.
 * Access restricted to ADMIN role.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Verify location exists
    const locationExists = await prisma.workLocation.findUnique({ where: { id } });
    if (!locationExists) {
      return NextResponse.json({ error: 'Work location not found' }, { status: 404 });
    }

    // 1. Disconnect the location from the user
    await prisma.staff.update({
      where: { id: userId },
      data: {
        workLocations: {
          disconnect: { id }
        }
      }
    });

    // 2. Clean up the location if no users are connected to it anymore
    const remainingUsers = await prisma.staff.count({
      where: {
        workLocations: {
          some: { id }
        }
      }
    });

    if (remainingUsers === 0) {
      await prisma.workLocation.delete({ where: { id } });
    }

    return NextResponse.json({
      success: true,
      message: 'Work location removed from user successfully'
    });
  } catch (error) {
    console.error('Admin delete work location error:', error);
    return NextResponse.json({ error: 'Failed to delete work location', message: error.message }, { status: 500 });
  }
}
