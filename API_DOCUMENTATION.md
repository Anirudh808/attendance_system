# Backend API Documentation

This document describes all API endpoints implemented in the Staff Attendance System.

---

## Authentication & Headers

Most protected endpoints require an `Authorization` header containing a valid JSON Web Token (JWT) in the Bearer token format:
```http
Authorization: Bearer <JWT_TOKEN>
```
The token is signed with a JWT secret and contains the following payload claims:
- `staffId`: Staff unique identifier
- `name`: Staff display name
- `email`: Staff email
- `department`: Department name
- `role`: Role (`ADMIN` or `STAFF`)

---

## Access Control Matrix

| Endpoint | Method | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticates user, returns token |
| `/api/auth/register` | `POST` | `ADMIN` | Registers new staff and uploads image to S3 |
| `/api/attendance/mark` | `POST` | `STAFF` or `ADMIN` | Marks attendance with GPS & Face Verification |
| `/api/attendance/records` | `GET` | `STAFF` or `ADMIN` | Retrieves calling user's attendance records |
| `/api/attendance/records/all` | `GET` | `STAFF` or `ADMIN` | Retrieves all attendance records (Company-wide) |
| `/api/attendance/status` | `GET` | `STAFF` or `ADMIN` | Determines check-in status at a location |
| `/api/admin/staff` | `GET` | `ADMIN` | Lists all staff members |
| `/api/admin/staff/[id]` | `GET` | `ADMIN` | Returns details, locations & logs of a staff member |
| `/api/admin/work-location` | `POST` | `ADMIN` | Adds a new work location for a user |
| `/api/admin/work-location/[id]` | `PUT` | `ADMIN` | Modifies an existing work location |
| `/api/admin/work-location/[id]` | `DELETE` | `ADMIN` | Deletes a work location configuration |
| `/api/health` | `GET` | Public | Server status check |

---

## 1. Authentication APIs

### 1.1 Login Staff
Authenticates a staff member and generates a 24-hour access token.
- **Source Code**: [login/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/auth/login/route.js)

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body (JSON)**:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `staffId` | `string` | Yes | Unique identifier of the staff (e.g., `EMP001`) |
  | `password` | `string` | Yes | Account password |

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "staff": {
        "id": "AS25-02",
        "name": "Anirudh",
        "email": "anirudhmounasamy@gmail.com",
        "department": "Engineering",
        "role": "ADMIN",
        "workLocation": {
          "latitude": 11.0404,
          "longitude": 77.0384,
          "address": "Sitra, Coimbatore"
        },
        "workLocations": [
          {
            "id": "loc-AS25-02",
            "userId": "AS25-02",
            "name": "Sitra, Coimbatore",
            "workLat": 11.0404,
            "workLon": 77.0384
          }
        ]
      }
    }
    ```

- **Error Responses**:
  - **400 Bad Request**: Missing `staffId` or `password` fields.
    ```json
    { "error": "Staff ID and password are required" }
    ```
  - **401 Unauthorized**: Invalid credentials (incorrect ID or password).
    ```json
    { "error": "Invalid credentials" }
    ```
  - **500 Internal Server Error**: Database connection or execution issues.

---

### 1.2 Register Staff
Creates a new staff profile, uploads reference image to S3 under `b2of/<id>.jpg`, and configures their initial work location.
- **Source Code**: [register/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/auth/register/route.js)

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: Yes (Must be `ADMIN`)
- **Request Type**: `multipart/form-data` or `application/json`
- **Request Parameters**:
  | Field | Type | Format | Required | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `string` | text | Yes | Desired staff ID |
  | `name` | `string` | text | Yes | Full Name |
  | `email` | `string` | text | Yes | Unique Email |
  | `password` | `string` | text | Yes | Password |
  | `department` | `string` | text | Yes | Department name |
  | `role` | `string` | text | No | User role (`ADMIN` / `STAFF`, defaults to `STAFF`) |
  | `workLat` | `number` | float | Yes | Latitude of main work location |
  | `workLon` | `number` | float | Yes | Longitude of main work location |
  | `workAddress` | `string` | text | Yes | Text address of main work location |
  | `image` / `file` | `binary` | file / base64 | Yes | Frontal profile image of the staff |

- **Success Response**:
  - **Status Code**: `201 Created`
  - **Payload**:
    ```json
    {
      "success": true,
      "message": "Staff registered successfully",
      "staff": {
        "id": "AS25-02",
        "name": "Anirudh",
        "email": "anirudhmounasamy@gmail.com",
        "department": "Engineering",
        "role": "ADMIN",
        "workLocation": {
          "latitude": 11.0404,
          "longitude": 77.0384,
          "address": "Sitra, Coimbatore"
        },
        "workLocations": [
          {
            "id": "loc-AS25-02",
            "userId": "AS25-02",
            "name": "Sitra, Coimbatore",
            "workLat": 11.0404,
            "workLon": 77.0384
          }
        ],
        "profileImageKey": "b2of/AS25-02.jpg"
      }
    }
    ```

- **Error Responses**:
  - **401 Unauthorized**: Calling user is not authenticated.
  - **403 Forbidden**: Calling user is authenticated but does not possess the `ADMIN` role.
  - **400 Bad Request**: Invalid coordinates, missing fields, or missing profile image.
  - **409 Conflict**: Staff ID or Email already exists in the system.
    ```json
    { 
      "error": "Conflict", 
      "message": "Staff ID already exists." 
    }
    ```
  - **500 Internal Server Error**: Downstream database failure or S3 upload error.

---

## 2. Attendance APIs

### 2.1 Mark Attendance
Processes geolocation verification and webcam-based face comparison to check in the user.
- **Source Code**: [mark/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/attendance/mark/route.js)

- **URL**: `/api/attendance/mark`
- **Method**: `POST`
- **Auth Required**: Yes (`STAFF` or `ADMIN`)
- **Request Body (JSON)**:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `latitude` | `number` | Yes | User's current GPS Latitude (-90 to 90) |
  | `longitude` | `number` | Yes | User's current GPS Longitude (-180 to 180) |
  | `accuracy` | `number` | No | GPS accuracy radius in meters (defaults to `0`) |
  | `timestamp` | `string` | No | ISO string timestamp |
  | `capturedImage` | `string` | Yes | Base64 Data URL format webcam selfie snapshot |
  | `workLocationId` | `string` | Yes | ID of the target work location selected |
  | `attendanceType` | `string` | No | Type of attendance mark: `CHECK_IN` or `CHECK_OUT` (defaults to `CHECK_IN`) |

- **Verification Logic**:
  1. Retrieves the target `WorkLocation` matching the requested `workLocationId`.
  2. Computes distance between current coordinates and work location coordinates using the Haversine formula.
  3. Validates if the user is within `50` meters (plus GPS accuracy allowance). If outside this boundary, the check-in is blocked.
  4. Downloads the reference profile image from S3, converts the webcam selfie to a binary buffer, and sends them to the face comparison service.
  5. If the comparison score is `< 40` (similarity percentage) or faces do not match, check-in is blocked, and an email notification is automatically dispatched to notify stakeholders of the mismatch.

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "success": true,
      "message": "Attendance marked as CHECK-IN successfully",
      "distance": 14.52,
      "status": "PRESENT",
      "recordId": "ATT-1780287727123"
    }
    ```

- **Error Responses**:
  - **401 Unauthorized**: Calling user is not authenticated.
  - **400 Bad Request**:
    - Missing required parameters or invalid coordinate values.
    - User is too far from the selected location:
      ```json
      {
        "error": "Attendance not allowed",
        "message": "You are 120.45m away from the selected work location. You must be within the work radius to mark attendance.",
        "distance": 120.45
      }
      ```
    - Face comparison mismatch (similarity score below threshold):
      ```json
      {
        "error": "Face mismatch",
        "message": "Your face does not match the registered profile image. Attendance not marked.",
        "compareResult": { "is_same_person": false, "similarity_percentage": 15.5 }
      }
      ```
  - **404 Not Found**: Staff record or selected work location not found.
  - **502 Bad Gateway**: Downstream face comparison API service error or image download failure:
    ```json
    {
      "error": "Face verification failed",
      "message": "Face comparison service returned an error",
      "compareResult": { "error": "Internal comparison error" }
    }
    ```
  - **500 Internal Server Error**: Database write failure or general server exception.

---

### 2.2 Retrieve Current User Attendance Records
Gets paginated list of attendance history records for the calling staff member.
- **Source Code**: [records/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/attendance/records/route.js)

- **URL**: `/api/attendance/records`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `limit` (number, default: `10`): Max logs to fetch.
  - `offset` (number, default: `0`): Skip count.

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "records": [
        {
          "id": "ATT-1780287727123",
          "staffId": "AS25-02",
          "staffName": "Anirudh",
          "timestamp": "2026-06-01T04:22:07.000Z",
          "latitude": 11.0404,
          "longitude": 77.0384,
          "accuracy": 5,
          "workLat": 11.0404,
          "workLon": 77.0384,
          "distanceFromWork": 0,
          "status": "PRESENT",
          "remarks": "Within work location radius (CHECK_IN)",
          "attendanceType": "CHECK_IN",
          "workLocationId": "loc-AS25-02",
          "workLocationName": "Sitra, Coimbatore"
        }
      ],
      "total": 1,
      "limit": 10,
      "offset": 0
    }
    ```

---

### 2.3 Retrieve All Attendance Records (Company-wide)
Gets a master list of all check-in logs across the entire company.
- **Source Code**: [all/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/attendance/records/all/route.js)

- **URL**: `/api/attendance/records/all`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `limit` (number, default: `50`): Max records to retrieve.
  - `offset` (number, default: `0`): Skip count.

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload Structure**:
    ```json
    {
      "records": [ ... ],
      "total": 120,
      "limit": 50,
      "offset": 0
    }
    ```

---

### 2.4 Check-in Status
Determines if the authenticated staff member is currently checked in at a specific work location.
- **Source Code**: [status/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/attendance/status/route.js)

- **URL**: `/api/attendance/status`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `locationId` (string, Required): The target WorkLocation ID.

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "checkedIn": true,
      "lastRecordType": "CHECK_IN"
    }
    ```

- **Error Responses**:
  - **400 Bad Request**: Missing `locationId` query parameter.
  - **401 Unauthorized**: Calling user is not authenticated.
  - **500 Internal Server Error**: Database query failed.

---

## 3. Admin Panel APIs

### 3.1 List All Staff
Returns basic metadata for all registered employees sorted alphabetically by name.
- **Source Code**: [staff/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/admin/staff/route.js)

- **URL**: `/api/admin/staff`
- **Method**: `GET`
- **Auth Required**: Yes (Must be `ADMIN`)

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    [
      {
        "id": "AS25-02",
        "name": "Anirudh",
        "email": "anirudhmounasamy@gmail.com",
        "department": "Engineering",
        "role": "ADMIN"
      },
      {
        "id": "Ajith",
        "name": "Ajith",
        "email": "ajith@gmail.com",
        "department": "Engineering",
        "role": "STAFF"
      }
    ]
    ```

- **Error Responses**:
  - **401 Unauthorized**: Calling user is not authenticated.
  - **403 Forbidden**: Calling user is not an `ADMIN`.

---

### 3.2 Get Staff Details
Returns detailed profile, list of all work locations, and full attendance history for a single user.
- **Source Code**: [[id]/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/admin/staff/[id]/route.js)

- **URL**: `/api/admin/staff/:id`
- **Method**: `GET`
- **Auth Required**: Yes (Must be `ADMIN`)
- **Path Parameters**:
  - `id`: Target staff ID (e.g. `Ajith`).

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "id": "Ajith",
      "name": "Ajith",
      "email": "ajith@gmail.com",
      "department": "Engineering",
      "role": "STAFF",
      "workLat": 11.0404,
      "workLon": 77.0384,
      "workAddress": "Sitra, Coimbatore",
      "profile_image": "b2of/Ajith.jpg",
      "workLocations": [
        {
          "id": "loc-Ajith",
          "userId": "Ajith",
          "name": "Sitra, Coimbatore",
          "workLat": 11.0404,
          "workLon": 77.0384
        }
      ],
      "attendance": [
        {
          "id": "ATT-1780287799000",
          "staffId": "Ajith",
          "staffName": "Ajith",
          "timestamp": "2026-06-01T04:25:00.000Z",
          "latitude": 11.0404,
          "longitude": 77.0384,
          "accuracy": 10,
          "workLat": 11.0404,
          "workLon": 77.0384,
          "distanceFromWork": 0,
          "status": "PRESENT",
          "remarks": "Within work location radius (CHECK_IN)",
          "attendanceType": "CHECK_IN",
          "workLocationId": "loc-Ajith",
          "workLocationName": "Sitra, Coimbatore"
        }
      ]
    }
    ```

- **Error Responses**:
  - **401 Unauthorized**: Calling user is not authenticated.
  - **403 Forbidden**: Calling user is not an `ADMIN`.
  - **404 Not Found**: Staff member does not exist.
    ```json
    { "error": "Staff member not found" }
    ```

---

### 3.3 Add Work Location
Configures a new work location for a specific staff member.
- **Source Code**: [work-location/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/admin/work-location/route.js)

- **URL**: `/api/admin/work-location`
- **Method**: `POST`
- **Auth Required**: Yes (Must be `ADMIN`)
- **Request Body (JSON)**:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `userId` | `string` | Yes | Target staff member ID |
  | `name` | `string` | Yes | Location address or display name (e.g. `Coimbatore Branch`) |
  | `workLat` | `number` | Yes | Location GPS Latitude (-90 to 90) |
  | `workLon` | `number` | Yes | Location GPS Longitude (-180 to 180) |

- **Success Response**:
  - **Status Code**: `201 Created`
  - **Payload**:
    ```json
    {
      "success": true,
      "message": "Work location added successfully",
      "location": {
        "id": "dd948e9f-5b00-4dbe-bed4-2f2a82357a24",
        "userId": "Ajith",
        "name": "Coimbatore Branch",
        "workLat": 11.0505,
        "workLon": 77.0606
      }
    }
    ```

- **Error Responses**:
  - **400 Bad Request**: Missing parameters or invalid GPS coordinates.
  - **401 Unauthorized**: Calling user is not authenticated.
  - **403 Forbidden**: Calling user is not an `ADMIN`.
  - **404 Not Found**: Target staff member does not exist.
    ```json
    { "error": "Target staff member not found" }
    ```

---

### 3.4 Update Work Location
Modifies details of an existing work location configuration.
- **Source Code**: [[id]/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/admin/work-location/[id]/route.js)

- **URL**: `/api/admin/work-location/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Must be `ADMIN`)
- **Path Parameters**:
  - `id`: The WorkLocation record ID.
- **Request Body (JSON)**:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `name` | `string` | Yes | Location name or address |
  | `workLat` | `number` | Yes | Location GPS Latitude (-90 to 90) |
  | `workLon` | `number` | Yes | Location GPS Longitude (-180 to 180) |

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "success": true,
      "message": "Work location updated successfully",
      "location": {
        "id": "dd948e9f-5b00-4dbe-bed4-2f2a82357a24",
        "userId": "Ajith",
        "name": "Coimbatore Branch - Edited",
        "workLat": 11.0707,
        "workLon": 77.0808
      }
    }
    ```

- **Error Responses**:
  - **400 Bad Request**: Invalid coordinates or missing fields.
  - **401 Unauthorized**: Calling user is not authenticated.
  - **403 Forbidden**: Calling user is not an `ADMIN`.
  - **404 Not Found**: WorkLocation record does not exist.
    ```json
    { "error": "Work location not found" }
    ```

---

### 3.5 Delete Work Location
Removes a work location configuration.
- **Source Code**: [[id]/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/admin/work-location/[id]/route.js)

- **URL**: `/api/admin/work-location/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Must be `ADMIN`)
- **Path Parameters**:
  - `id`: The WorkLocation record ID.

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "success": true,
      "message": "Work location deleted successfully"
    }
    ```

- **Error Responses**:
  - **401 Unauthorized**: Calling user is not authenticated.
  - **403 Forbidden**: Calling user is not an `ADMIN`.
  - **404 Not Found**: WorkLocation record does not exist.
    ```json
    { "error": "Work location not found" }
    ```

---

## 4. Utility APIs

### 4.1 Health Check
Utility route to verify server status and network routing.
- **Source Code**: [health/route.js](file:///c:/Users/SPEXTRUM/Desktop/staff_attendance_system/nextjs_app/src/app/api/health/route.js)

- **URL**: `/api/health`
- **Method**: `GET`
- **Auth Required**: No

- **Success Response**:
  - **Status Code**: `200 OK`
  - **Payload**:
    ```json
    { "status": "Server is running" }
    ```
