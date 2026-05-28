import { NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { calculateDistance, isWithinRadius } from '@/lib/geolocation';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ATTENDANCE_RADIUS_METERS = Number(process.env.ATTENDANCE_RADIUS_METERS) || 50;

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    // Authenticate token
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const staffId = user.staffId;
    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, timestamp, accuracy, capturedImage } = body;

    // Validate input
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    if (!capturedImage) {
      return NextResponse.json({ error: 'Captured image is required for face verification' }, { status: 400 });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Get staff data from PostgreSQL database
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    // Calculate distance from work location
    const workLat = staff.workLat;
    const workLon = staff.workLon;
    
    // Default accuracy to 0 if not provided
    const gpsAccuracy = accuracy || 0;
    const distance = Math.max(0, calculateDistance(latitude, longitude, workLat, workLon) - gpsAccuracy);

    // Check if within work radius
    const isWithinWorkRadius = isWithinRadius(latitude, longitude, workLat, workLon, ATTENDANCE_RADIUS_METERS, gpsAccuracy);

    // Only allow attendance marking if within radius
    if (!isWithinWorkRadius) {
      return NextResponse.json({
        error: 'Attendance not allowed',
        message: `You are ${distance.toFixed(2)}m away from work location. You must be within ${ATTENDANCE_RADIUS_METERS}m to mark attendance.`,
        distance: parseFloat(distance.toFixed(2)),
      }, { status: 400 });
    }

    
// Generate signed URL for profile image from S3
let profileImageUrl;
try {
    const getObjectCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `b2of/AS25-02.jpg`,
    });
    profileImageUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
} catch (s3Error) {
    console.error('S3 signed URL generation error:', s3Error);
    return {
    error: 'Profile image retrieval failed',
    message: 'Unable to generate signed URL for profile image',
    };
}
console.log('Generated signed URL for profile image:', profileImageUrl);

let profileImageBase64;
let profileImageBuffer;
try {
    const profileImageResponse = await fetch(profileImageUrl);
    if (!profileImageResponse.ok) {
    throw new Error('Failed to download profile image from S3');
    }
    profileImageBuffer = Buffer.from(await profileImageResponse.arrayBuffer());
    profileImageBase64 = profileImageBuffer.toString('base64');
    console.log('Profile image downloaded and converted to base64, size:', profileImageBase64.length);
} catch (fetchError) {
    console.error('Profile image download error:', fetchError);
    return{
    error: 'Profile image download failed',
    message: 'Unable to download profile image from S3',
    };
}


    // Convert capturedImage (which is a base64 Data URL) to binary Buffer
    let capturedImageBuffer;
    if (capturedImage.startsWith('data:')) {
      const matches = capturedImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        capturedImageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        const base64Data = capturedImage.split(',')[1];
        capturedImageBuffer = Buffer.from(base64Data, 'base64');
      }
    } else {
      capturedImageBuffer = Buffer.from(capturedImage, 'base64');
    }

    // Send both images to the compare service
    const compareForm = new FormData();
    compareForm.append('image1', new Blob([capturedImageBuffer]), "capturedImage.jpg");
    compareForm.append('image2', new Blob([profileImageBuffer]), "profileImage.jpg");
 const compareResponse = await fetch('http://54.159.44.101:5001/compare', {
    method: 'POST',
    body: compareForm,
});


    const compareResult = await compareResponse.json();
    console.log('Face comparison result:', compareResult);

    if (!compareResponse.ok) {
      return NextResponse.json({
        error: 'Face verification failed',
        message: compareResult.message || 'Face comparison service returned an error',
        compareResult,
      }, { status: 502 });
    }

    if (!compareResult.is_same_person || compareResult.similarity_percentage < 40) {
      return NextResponse.json({
        error: 'Face mismatch',
        message: 'Your face does not match the registered profile image. Attendance not marked.',
        compareResult,
      }, { status: 400 });
    }

    const recordId = `ATT-${Date.now()}`;
    const dateVal = timestamp ? new Date(timestamp) : new Date();

    // Create attendance record in database
    await prisma.attendance.create({
      data: {
        id: recordId,
        staffId,
        staffName: staff.name,
        timestamp: dateVal,
        currentLat: latitude,
        currentLon: longitude,
        accuracy: gpsAccuracy,
        workLat,
        workLon,
        distanceFromWork: parseFloat(distance.toFixed(2)),
        status: 'PRESENT',
        remarks: 'Within work location radius',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance marked as PRESENT',
      distance: parseFloat(distance.toFixed(2)),
      status: 'PRESENT',
      recordId: recordId,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return NextResponse.json({ error: 'Failed to mark attendance', message: error.message }, { status: 500 });
  }
}
