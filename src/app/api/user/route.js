import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 },
      );
    }
    const { staffId, email } = user;
    const staff = await prisma.staff.findFirst({
      where: {
        OR: [{ id: staffId }, { email: email }],
      },
      include: {
        workLocations: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      message: "Login successful",
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        department: staff.department,
        role: staff.role,
        workLocation: {
          latitude: staff.workLat,
          longitude: staff.workLon,
          address: staff.workAddress,
        },
        workLocations: staff.workLocations,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
