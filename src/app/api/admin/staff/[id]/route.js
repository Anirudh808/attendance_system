import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { s3Service } from '@/services/server/s3Service';

/**
 * GET handler to return details (locations, attendance) for a specific staff member.
 * Access restricted to ADMIN role.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        workLocations: {
          orderBy: {
            id: 'asc'
          }
        },
        attendance: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Exclude password from response for security
    const { password, ...safeStaff } = staff;

    const primaryLocation = staff.workLocations[0] || null;
    const responseData = {
      ...safeStaff,
      workLocation: primaryLocation ? {
        id: primaryLocation.id,
        latitude: primaryLocation.workLat,
        longitude: primaryLocation.workLon,
        address: primaryLocation.name,
      } : null
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Admin get staff detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff details', message: error.message }, { status: 500 });
  }
}

/**
 * DELETE handler to remove a staff member.
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

    // Prevent self-deletion
    if (caller.staffId === id) {
      return NextResponse.json({ error: 'Bad Request', message: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    // Verify staff member exists
    const staffExists = await prisma.staff.findUnique({ where: { id } });
    if (!staffExists) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Delete staff member from database (cascades to Attendance and WorkLocation)
    await prisma.staff.delete({
      where: { id }
    });

    // Attempt to delete profile image from S3
    try {
      const s3Key = `b2of/${id}.jpg`;
      await s3Service.deleteProfileImage(s3Key);
    } catch (s3Error) {
      console.warn(`S3 profile image deletion failed for staff ${id}:`, s3Error.message);
      // Do not fail the request if database deletion succeeded but S3 failed
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete staff error:', error);
    return NextResponse.json({ error: 'Failed to delete staff member', message: error.message }, { status: 500 });
  }
}
