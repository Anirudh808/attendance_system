import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET handler to return all staff members for Admin Panel.
 * Access restricted to ADMIN role.
 */
export async function GET(request) {
  try {
    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const staff = await prisma.staff.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Admin list staff error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff members', message: error.message }, { status: 500 });
  }
}
