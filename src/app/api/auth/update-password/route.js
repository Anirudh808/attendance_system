import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * POST handler to update the logged-in user's password.
 * Access restricted to authenticated users (ADMIN or STAFF).
 */
export async function POST(request) {
  try {
    const caller = verifyAuth(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    const cleanCurrentPassword = currentPassword.toString();
    const cleanNewPassword = newPassword.toString();

    // Query user record
    const staff = await prisma.staff.findUnique({
      where: { id: caller.staffId }
    });

    if (!staff) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password (plain text prototype check)
    if (staff.password !== cleanCurrentPassword) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    // Update password
    await prisma.staff.update({
      where: { id: caller.staffId },
      data: { password: cleanNewPassword }
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json({ error: 'Failed to update password', message: error.message }, { status: 500 });
  }
}
