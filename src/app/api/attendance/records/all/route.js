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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Get all attendance records
    const allRecords = await readJsonFile('attendance.json');

    // Sort by timestamp descending
    allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedRecords = allRecords.slice(offset, offset + limit);

    return NextResponse.json({
      records: paginatedRecords,
      total: allRecords.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get all records error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', message: error.message }, { status: 500 });
  }
}
