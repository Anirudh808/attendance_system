import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

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

    return NextResponse.json(safeStaff);
  } catch (error) {
    console.error('Admin get staff detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff details', message: error.message }, { status: 500 });
  }
}
