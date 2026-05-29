import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { attendanceService } from '@/services/server/attendanceService';

/**
 * API Handler to retrieve all attendance records (admin view).
 * Decouples database queries into attendanceService.
 *
 * @param {Request} request - NextJS request object
 * @returns {Promise<NextResponse>} API response with list of all attendance logs
 */
export async function GET(request) {
  try {
    // Authenticate token
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Fetch records and count from DB using service layer
    const { records, total } = await attendanceService.getAllRecords(limit, offset);

    return NextResponse.json({
      records,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get all records error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', message: error.message }, { status: 500 });
  }
}
