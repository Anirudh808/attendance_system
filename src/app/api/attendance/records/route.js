import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/fileStorage';
import { verifyAuth } from '@/lib/auth';

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

    // Get all attendance records
    const allRecords = await readJsonFile('attendance.json');

    // Filter by current staff
    const staffRecords = allRecords.filter((r) => r.staffId === staffId);

    // Sort by timestamp descending (most recent first)
    staffRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedRecords = staffRecords.slice(offset, offset + limit);

    return NextResponse.json({
      records: paginatedRecords,
      total: staffRecords.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get records error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', message: error.message }, { status: 500 });
  }
}
