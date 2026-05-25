import "./globals.css";

export const metadata = {
  title: "Staff Attendance System",
  description: "Secure geolocation-based staff attendance system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
