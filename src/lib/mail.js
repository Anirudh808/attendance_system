import nodemailer from 'nodemailer';

// SMTP Configuration from environment variables
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
const emailFrom = process.env.SMTP_FROM || '"Staff Attendance System" <noreply@attendance.com>';

export async function sendFaceMismatchEmail({
  staff,
  capturedImageBuffer,
  profileImageBuffer,
  timestamp,
  accuracy,
  latitude,
  longitude,
  distance,
  aiResponse,
  errorMessage,
}) {
  // If SMTP configurations are missing, we should still try to log them or throw an error
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('SMTP configuration is missing. Cannot send mismatch email.');
    return { success: false, error: 'SMTP config missing' };
  }

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "anirudhmounasamy@gmail.com",
    pass: process.env.SMTP_PASS, // The 16-character App Password
  },
});

  const formattedTime = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();

  // Create a clean HTML layout
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f9;
            color: #333333;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 650px;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
            margin: 0 auto;
            border: 1px solid #e1e8ed;
          }
          .header {
            background-color: #d9534f;
            color: #ffffff;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
          }
          .content {
            padding: 24px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #d9534f;
            border-bottom: 2px solid #f2dede;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .info-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #f0f0f0;
          }
          .info-table td.label {
            font-weight: 600;
            color: #666666;
            width: 35%;
          }
          .info-table td.value {
            color: #111111;
          }
          .comparison-container {
            margin-top: 15px;
            overflow: hidden;
          }
          .image-box {
            width: 47%;
            float: left;
            text-align: center;
            border: 1px solid #e1e8ed;
            border-radius: 6px;
            background-color: #fafbfc;
            padding: 8px;
            box-sizing: border-box;
          }
          .image-box.right {
            float: right;
          }
          .image-box img {
            max-width: 100%;
            height: auto;
            max-height: 250px;
            border-radius: 4px;
            object-fit: cover;
            border: 1px solid #ddd;
          }
          .image-title {
            font-weight: bold;
            font-size: 14px;
            margin-top: 8px;
            color: #555;
          }
          .clearfix {
            clear: both;
          }
          .log-box {
            background-color: #272822;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            overflow-x: auto;
            white-space: pre-wrap;
            margin-top: 10px;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #777777;
            border-top: 1px solid #e1e8ed;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Face Mismatch Alert</h1>
          </div>
          <div class="content">
            <p>An attempt to mark attendance failed face verification. The captured photo does not match the registered profile image.</p>
            
            <div class="section-title">Employee Information</div>
            <table class="info-table">
              <tr>
                <td class="label">Name</td>
                <td class="value">${staff?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Staff ID</td>
                <td class="value">${staff?.id || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Email</td>
                <td class="value">${staff?.email || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Department</td>
                <td class="value">${staff?.department || 'N/A'}</td>
              </tr>
            </table>

            <div class="section-title">Verification Details</div>
            <table class="info-table">
              <tr>
                <td class="label">Timestamp</td>
                <td class="value">${formattedTime}</td>
              </tr>
              <tr>
                <td class="label">Coordinates</td>
                <td class="value">Lat: ${latitude ?? 'N/A'}, Lon: ${longitude ?? 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Distance to Office</td>
                <td class="value">${distance !== undefined ? distance.toFixed(2) + ' meters' : 'N/A'} (Accuracy: ±${accuracy !== undefined ? Math.round(accuracy) : 'N/A'}m)</td>
              </tr>
              <tr>
                <td class="label">AI Status</td>
                <td class="value" style="color: #d9534f; font-weight: bold;">MISMATCH</td>
              </tr>
              ${errorMessage ? `
              <tr>
                <td class="label">AI Error Message</td>
                <td class="value" style="color: #c9302c;">${errorMessage}</td>
              </tr>` : ''}
            </table>

            <div class="section-title">Face Verification Images</div>
            <div class="comparison-container">
              <div class="image-box">
                <img src="cid:capturedImage" alt="Captured Image" />
                <div class="image-title">Captured Image</div>
              </div>
              <div class="image-box right">
                <img src="cid:profileImage" alt="Registered Profile Image" />
                <div class="image-title">Registered Profile Image</div>
              </div>
              <div class="clearfix"></div>
            </div>

            ${aiResponse ? `
            <div class="section-title">AI Server Log Details</div>
            <div class="log-box">${JSON.stringify(aiResponse, null, 2)}</div>
            ` : ''}
          </div>
          <div class="footer">
            This is an automated security notification generated by the Staff Attendance System.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: emailFrom,
    to: 'anirudhmounasamy@gmail.com',
    subject: `[ALERT] Face Verification Mismatch - ${staff?.name || 'Unknown Staff'} (${staff?.id || 'Unknown ID'})`,
    html: htmlContent,
    attachments: [
      {
        filename: 'captured_image.jpg',
        content: capturedImageBuffer,
        cid: 'capturedImage',
      },
      {
        filename: 'profile_image.jpg',
        content: profileImageBuffer,
        cid: 'profileImage',
      },
    ],
  };

  try {
    console.log(`Sending face mismatch email to anirudhmounasamy@gmail.com for staff: ${staff?.id}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send mismatch email:', error);
    return { success: false, error: error.message };
  }
}
