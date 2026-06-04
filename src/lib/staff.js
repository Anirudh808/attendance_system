export async function getStaffByIdOrEmail(identifier) {
  try {
    const response = await fetch("/api/user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Error fetching staff: ${response.statusText}`);
    }
    const data = await response.json();
    return data.staff;
  } catch (error) {
    console.error("Error in getStaffByIdOrEmail:", error);
    throw error;
  }
}

/**
 * @description API route handler for marking attendance (check-in/check-out)
 * Validates input, authenticates user, and processes attendance marking
 * with geolocation and face verification.
 *
 * @param {Request} request - The incoming HTTP request containing attendance data
 * @returns {Promise<NextResponse>} API response with operation status
 */
