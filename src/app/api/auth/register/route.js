import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { s3Service } from '@/services/server/s3Service';

/**
 * API Handler for registering a new staff member.
 * Supports multipart/form-data (file upload) and application/json (base64 image data).
 * Uploads reference photo to S3 under folder b2of with filename as UserID.jpg,
 * and saves user details to the Staff table in the database.
 * 
 * @param {Request} request - NextJS request object
 * @returns {Promise<NextResponse>} API response with staff registration status
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let id, name, email, password, department, workLat, workLon, workAddress, imageBuffer, imageContentType;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = formData.get('id');
      name = formData.get('name');
      email = formData.get('email');
      password = formData.get('password');
      department = formData.get('department');
      const rawLat = formData.get('workLat');
      const rawLon = formData.get('workLon');
      workLat = rawLat ? parseFloat(rawLat.toString()) : undefined;
      workLon = rawLon ? parseFloat(rawLon.toString()) : undefined;
      workAddress = formData.get('workAddress');
      
      const file = formData.get('image') || formData.get('file');
      if (file && typeof file !== 'string') {
        const arrayBuffer = await file.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        imageContentType = file.type || 'image/jpeg';
      }
    } else {
      const body = await request.json().catch(() => ({}));
      id = body.id;
      name = body.name;
      email = body.email;
      password = body.password;
      department = body.department;
      workLat = body.workLat !== undefined ? parseFloat(body.workLat) : undefined;
      workLon = body.workLon !== undefined ? parseFloat(body.workLon) : undefined;
      workAddress = body.workAddress;
      
      const capturedImage = body.image || body.file || body.capturedImage;
      if (capturedImage) {
        imageContentType = 'image/jpeg';
        if (capturedImage.startsWith('data:')) {
          const matches = capturedImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            imageContentType = matches[1];
            imageBuffer = Buffer.from(matches[2], 'base64');
          } else {
            const base64Data = capturedImage.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
          }
        } else {
          imageBuffer = Buffer.from(capturedImage, 'base64');
        }
      }
    }

    // Convert values if needed and trim string values
    const cleanId = id?.toString().trim();
    const cleanName = name?.toString().trim();
    const cleanEmail = email?.toString().trim();
    const cleanPassword = password?.toString().trim();
    const cleanDepartment = department?.toString().trim();
    const cleanWorkAddress = workAddress?.toString().trim();

    // 2. Validate inputs
    if (!cleanId || !cleanName || !cleanEmail || !cleanPassword || !cleanDepartment || workLat === undefined || isNaN(workLat) || workLon === undefined || isNaN(workLon) || !cleanWorkAddress) {
      return NextResponse.json({ 
        error: 'Missing or invalid fields', 
        message: 'All fields (id, name, email, password, department, workLat, workLon, workAddress) are required.' 
      }, { status: 400 });
    }

    if (!imageBuffer) {
      return NextResponse.json({ 
        error: 'Profile image required', 
        message: 'Profile image file is required.' 
      }, { status: 400 });
    }

    // Check if staff ID or email already exists
    const existingStaffById = await prisma.staff.findUnique({ where: { id: cleanId } });
    if (existingStaffById) {
      return NextResponse.json({ 
        error: 'Conflict', 
        message: 'Staff ID already exists.' 
      }, { status: 409 });
    }

    const existingStaffByEmail = await prisma.staff.findUnique({ where: { email: cleanEmail } });
    if (existingStaffByEmail) {
      return NextResponse.json({ 
        error: 'Conflict', 
        message: 'Email already registered.' 
      }, { status: 409 });
    }

    // 3. Upload image to S3
    // Key format: b2of/UserID.jpg
    const s3Key = `b2of/${cleanId}.jpg`;
    await s3Service.uploadProfileImage(imageBuffer, s3Key, imageContentType);

    // 4. Create staff record in the database
    const staff = await prisma.staff.create({
      data: {
        id: cleanId,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword, // Aligning with plain text password in login API for prototype validation
        department: cleanDepartment,
        workLat,
        workLon,
        workAddress: cleanWorkAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff registered successfully',
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
        profileImageKey: s3Key,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ 
      error: 'Registration failed', 
      message: error.message 
    }, { status: 500 });
  }
}
