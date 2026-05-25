import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { staffId, password } = body;

    // Validate input
    if (!staffId || !password) {
      return NextResponse.json({ error: 'Staff ID and password are required' }, { status: 400 });
    }

    // Query staff record using Prisma
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Simple password verification for prototype
    if (staff.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT token (valid for 24 hours)
    const token = jwt.sign(
      {
        staffId: staff.id,
        name: staff.name,
        email: staff.email,
        department: staff.department,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      message: 'Login successful',
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        department: staff.department,
        workLocation: {
          latitude: staff.workLat,
          longitude: staff.workLon,
          address: staff.workAddress,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed', message: error.message }, { status: 500 });
  }
}
