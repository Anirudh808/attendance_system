import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET handler to return the currently authenticated user's profile details.
 * Access restricted to logged-in users with a valid JWT token.
 */
export async function GET(request) {
  try {
    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: caller.staffId },
      include: {
        workLocations: {
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (!staff) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Exclude password from response for security
    const { password, ...safeUser } = staff;

    // Structure response data to match the format expected by the frontend
    const responseData = {
      ...safeUser,
      workLocation: staff.workLocations[0] ? {
        id: staff.workLocations[0].id,
        latitude: staff.workLocations[0].workLat,
        longitude: staff.workLocations[0].workLon,
        address: staff.workLocations[0].name,
      } : null
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile data', message: error.message }, { status: 500 });
  }
}
