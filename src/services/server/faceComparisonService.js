const COMPARE_SERVICE_URL = process.env.COMPARE_SERVICE_URL || 'http://54.159.44.101:5001/compare';

/**
 * Service to handle face verification and comparison API operations.
 */
export const faceComparisonService = {
  /**
   * Compares the captured image against the registered profile image using the external AI service.
   * 
   * @param {Buffer} capturedImageBuffer - Buffer containing the captured selfie image
   * @param {Buffer} profileImageBuffer - Buffer containing the profile image downloaded from S3
   * @returns {Promise<{ok: boolean, result: Object}>} The API status and JSON result payload
   */
  async compareFaces(capturedImageBuffer, profileImageBuffer) {
    try {
      const compareForm = new FormData();
      compareForm.append('image1', new Blob([capturedImageBuffer]), 'capturedImage.jpg');
      compareForm.append('image2', new Blob([profileImageBuffer]), 'profileImage.jpg');

      const response = await fetch(COMPARE_SERVICE_URL, {
        method: 'POST',
        body: compareForm,
      });

      const result = await response.json();
      return {
        ok: response.ok,
        result,
      };
    } catch (error) {
      console.error('Error invoking face comparison service:', error);
      throw new Error(`Face comparison service invocation failed: ${error.message}`);
    }
  }
};
