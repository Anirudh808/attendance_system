import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { attendanceService } from '@/services/server/attendanceService';

/**
 * GET handler to check if a staff member is currently checked in at a specific location.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>} API response with checking status
 */
export async function GET(request) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: 'locationId query parameter is required' }, { status: 400 });
    }

    const lastRecord = await attendanceService.getLastRecordForLocation(user.staffId, locationId);
    
    // Checked in if the last record exists and is of type CHECK_IN
    const isCheckedIn = lastRecord ? lastRecord.attendanceType === 'CHECK_IN' : false;

    return NextResponse.json({
      checkedIn: isCheckedIn,
      lastRecordType: lastRecord ? lastRecord.attendanceType : null
    });
  } catch (error) {
    console.error('Fetch location check-in status error:', error);
    return NextResponse.json({ error: 'Failed to fetch status', message: error.message }, { status: 500 });
  }
}
