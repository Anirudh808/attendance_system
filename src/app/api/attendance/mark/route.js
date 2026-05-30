import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { s3Service } from '@/services/server/s3Service';
import { faceComparisonService } from '@/services/server/faceComparisonService';
import { attendanceService } from '@/services/server/attendanceService';
import { sendFaceMismatchEmail } from '@/lib/mail';

/**
 * API Handler for marking attendance with location and face verification.
 * Decouples logic into helper services: s3Service, faceComparisonService, and attendanceService.
 *
 * @param {Request} request - NextJS request object
 * @returns {Promise<NextResponse>} API response with operation status
 */
export async function POST(request) {
  try {
    // 1. Authenticate token
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const staffId = user.staffId;
    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, timestamp, accuracy, capturedImage } = body;

    // 2. Validate inputs
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

    // 3. Retrieve staff details
    const staff = await attendanceService.getStaffById(staffId);
    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    // 4. Verify work location radius
    const gpsAccuracy = accuracy || 0;
    const { distance, isWithinWorkRadius } = attendanceService.verifyWorkRadius(
      latitude,
      longitude,
      staff,
      gpsAccuracy
    );

    // Block check-in if worker is outside the configured boundaries
    if (!isWithinWorkRadius) {
      return NextResponse.json({
        error: 'Attendance not allowed',
        message: `You are ${distance.toFixed(2)}m away from work location. You must be within the work radius to mark attendance.`,
        distance,
      }, { status: 400 });
    }

    // 5. Retrieve profile image from S3
    const s3Key = staff.profile_image || `b2of/${staffId}.jpg`;
    console.log(s3Key);
    const profileImageUrl = await s3Service.getProfileImageUrl(s3Key);
    console.log('Profile image URL:', profileImageUrl);
    const profileImageBuffer = await s3Service.downloadProfileImage(profileImageUrl);

    // 6. Convert captured face image Data URL to binary Buffer
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

    // 7. Verify faces using the AI comparison service
    const { ok: compareOk, result: compareResult } = await faceComparisonService.compareFaces(
      capturedImageBuffer,
      profileImageBuffer
    );

    console.log('Face comparison result:', compareResult);

    // Handle comparison service errors
    if (!compareOk) {
      // Trigger the face mismatch/error email pipeline asynchronously (non-blocking)
      sendFaceMismatchEmail({
        staff,
        capturedImageBuffer,
        profileImageBuffer,
        timestamp,
        accuracy: gpsAccuracy,
        latitude,
        longitude,
        distance,
        aiResponse: compareResult,
        errorMessage: compareResult.error || compareResult.message || 'Face comparison service returned an error response'
      }).catch((mailError) => {
        console.error('Failed to send email notification on verification failure in background:', mailError);
      });

      return NextResponse.json({
        error: 'Face verification failed',
        message: compareResult.message || 'Face comparison service returned an error',
        compareResult,
      }, { status: 502 });
    }

    // Handle face mismatch (similarity score below safe threshold)
    if (!compareResult.is_same_person || compareResult.similarity_percentage < 40) {
      // Trigger the face mismatch email pipeline asynchronously (non-blocking)
      sendFaceMismatchEmail({
        staff,
        capturedImageBuffer,
        profileImageBuffer,
        timestamp,
        accuracy: gpsAccuracy,
        latitude,
        longitude,
        distance,
        aiResponse: compareResult,
        errorMessage: compareResult.message || 'Face comparison similarity score is below the required threshold'
      }).catch((mailError) => {
        console.error('Failed to send email notification on face mismatch in background:', mailError);
      });

      return NextResponse.json({
        error: 'Face mismatch',
        message: 'Your face does not match the registered profile image. Attendance not marked.',
        compareResult,
      }, { status: 400 });
    }

    // 8. Create attendance record in database
    const recordId = `ATT-${Date.now()}`;
    const dateVal = timestamp ? new Date(timestamp) : new Date();

    await attendanceService.createAttendanceRecord({
      id: recordId,
      staffId,
      staffName: staff.name,
      timestamp: dateVal,
      latitude,
      longitude,
      accuracy: gpsAccuracy,
      workLat: staff.workLat,
      workLon: staff.workLon,
      distanceFromWork: distance,
      status: 'PRESENT',
      remarks: 'Within work location radius',
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance marked as PRESENT',
      distance,
      status: 'PRESENT',
      recordId,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return NextResponse.json({ error: 'Failed to mark attendance', message: error.message }, { status: 500 });
  }
}
