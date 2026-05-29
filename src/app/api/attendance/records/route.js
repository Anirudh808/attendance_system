import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { attendanceService } from '@/services/server/attendanceService';

/**
 * API Handler to retrieve attendance records for the authenticated staff member.
 * Decouples database queries into attendanceService.
 *
 * @param {Request} request - NextJS request object
 * @returns {Promise<NextResponse>} API response with staff attendance history list
 */
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

    // Fetch records and count from DB using service layer
    const { records, total } = await attendanceService.getStaffRecords(staffId, limit, offset);

    return NextResponse.json({
      records,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get records error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', message: error.message }, { status: 500 });
  }
}
