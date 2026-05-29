import { prisma } from '@/lib/prisma';
import { calculateDistance, isWithinRadius } from '@/lib/geolocation';

const ATTENDANCE_RADIUS_METERS = Number(process.env.ATTENDANCE_RADIUS_METERS) || 50;

/**
 * Service to handle attendance logic and database operations.
 */
export const attendanceService = {
  /**
   * Retrieves a staff record by ID.
   * 
   * @param {string} id - Staff ID
   * @returns {Promise<Object|null>} Staff record or null if not found
   */
  async getStaffById(id) {
    try {
      return await prisma.staff.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error fetching staff with ID ${id}:`, error);
      throw new Error(`Failed to fetch staff record: ${error.message}`);
    }
  },

  /**
   * Validates if a coordinate is within the permitted work radius.
   * 
   * @param {number} latitude - Current latitude
   * @param {number} longitude - Current longitude
   * @param {Object} staff - Staff record with workLat and workLon
   * @param {number} [accuracy=0] - GPS accuracy in meters
   * @returns {{distance: number, isWithinWorkRadius: boolean}}
   */
  verifyWorkRadius(latitude, longitude, staff, accuracy = 0) {
    const workLat = staff.workLat;
    const workLon = staff.workLon;
    
    const gpsAccuracy = accuracy || 0;
    const distance = Math.max(0, calculateDistance(latitude, longitude, workLat, workLon) - gpsAccuracy);
    const isWithinWorkRadius = isWithinRadius(latitude, longitude, workLat, workLon, ATTENDANCE_RADIUS_METERS, gpsAccuracy);

    return {
      distance: parseFloat(distance.toFixed(2)),
      isWithinWorkRadius,
    };
  },

  /**
   * Creates an attendance record in the database.
   * 
   * @param {Object} data - Attendance data fields
   * @returns {Promise<Object>} The created database record
   */
  async createAttendanceRecord(data) {
    try {
      return await prisma.attendance.create({
        data: {
          id: data.id || `ATT-${Date.now()}`,
          staffId: data.staffId,
          staffName: data.staffName,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          currentLat: data.latitude,
          currentLon: data.longitude,
          accuracy: data.accuracy || 0,
          workLat: data.workLat,
          workLon: data.workLon,
          distanceFromWork: data.distanceFromWork,
          status: data.status || 'PRESENT',
          remarks: data.remarks || 'Within work location radius',
        },
      });
    } catch (error) {
      console.error('Error creating attendance record in DB:', error);
      throw new Error(`Failed to create attendance record: ${error.message}`);
    }
  },

  /**
   * Fetches attendance records for a specific staff member.
   * 
   * @param {string} staffId - Staff ID filter
   * @param {number} limit - Maximum number of records to retrieve
   * @param {number} offset - Number of records to skip
   * @returns {Promise<{records: Array, total: number}>} Mapped records and total count
   */
  async getStaffRecords(staffId, limit, offset) {
    try {
      const records = await prisma.attendance.findMany({
        where: { staffId },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit,
      });

      const total = await prisma.attendance.count({
        where: { staffId },
      });

      return {
        records: this.mapRecords(records),
        total,
      };
    } catch (error) {
      console.error(`Error fetching records for staff ${staffId}:`, error);
      throw new Error(`Failed to retrieve staff records: ${error.message}`);
    }
  },

  /**
   * Fetches all attendance records (admin view).
   * 
   * @param {number} limit - Maximum number of records to retrieve
   * @param {number} offset - Number of records to skip
   * @returns {Promise<{records: Array, total: number}>} Mapped records and total count
   */
  async getAllRecords(limit, offset) {
    try {
      const records = await prisma.attendance.findMany({
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit,
      });

      const total = await prisma.attendance.count();

      return {
        records: this.mapRecords(records),
        total,
      };
    } catch (error) {
      console.error('Error fetching all records:', error);
      throw new Error(`Failed to retrieve all records: ${error.message}`);
    }
  },

  /**
   * Maps raw Prisma database records to the structure expected by the frontend.
   * 
   * @param {Array} records - Array of raw Prisma attendance objects
   * @returns {Array} Mapped attendance objects
   */
  mapRecords(records) {
    return records.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: r.staffName,
      timestamp: r.timestamp.toISOString(),
      currentLocation: {
        latitude: r.currentLat,
        longitude: r.currentLon,
        accuracy: r.accuracy,
      },
      workLocation: {
        latitude: r.workLat,
        longitude: r.workLon,
      },
      distanceFromWork: r.distanceFromWork,
      status: r.status,
      remarks: r.remarks,
    }));
  }
};
