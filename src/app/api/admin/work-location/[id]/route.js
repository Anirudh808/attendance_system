import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * PUT handler to update a work location.
 * Access restricted to ADMIN role.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, workLat, workLon } = body;

    // Validate inputs
    if (!name || workLat === undefined || workLon === undefined) {
      return NextResponse.json({ error: 'Missing required fields (name, workLat, workLon)' }, { status: 400 });
    }

    const cleanName = name.toString().trim();
    const parsedLat = parseFloat(workLat);
    const parsedLon = parseFloat(workLon);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    if (!cleanName) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    // Verify location exists
    const locationExists = await prisma.workLocation.findUnique({ where: { id } });
    if (!locationExists) {
      return NextResponse.json({ error: 'Work location not found' }, { status: 404 });
    }

    // Update Work Location
    const updatedLocation = await prisma.workLocation.update({
      where: { id },
      data: {
        name: cleanName,
        workLat: parsedLat,
        workLon: parsedLon
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Work location updated successfully',
      location: updatedLocation
    });
  } catch (error) {
    console.error('Admin update work location error:', error);
    return NextResponse.json({ error: 'Failed to update work location', message: error.message }, { status: 500 });
  }
}

/**
 * DELETE handler to remove a work location.
 * Access restricted to ADMIN role.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify location exists
    const locationExists = await prisma.workLocation.findUnique({ where: { id } });
    if (!locationExists) {
      return NextResponse.json({ error: 'Work location not found' }, { status: 404 });
    }

    // Delete Work Location
    await prisma.workLocation.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Work location deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete work location error:', error);
    return NextResponse.json({ error: 'Failed to delete work location', message: error.message }, { status: 500 });
  }
}
