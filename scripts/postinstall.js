import https from 'https';

// IMPORTANT: Replace this URL with your actual endpoint for tracking installations.
const TRACKING_URL = 'https://admin.autotestdata.com/prog/install';

function trackInstallation() {
  try {
    // Only track if it is NOT being installed during local development (optional check)
    // if (process.env.NODE_ENV === 'development') return;

    const req = https.get(TRACKING_URL, (res) => {
      // Read response to free up memory, but we don't need to do anything with it
      res.on('data', () => { });
    });

    req.on('error', () => {
      // Silently fail, do not block or crash the user's installation
    });

    // Set a short timeout (e.g., 3 seconds) to ensure the installation doesn't hang 
    // if the tracking server is slow or unresponsive.
    req.setTimeout(3000, () => {
      req.destroy();
    });
  } catch (error) {
    // Silently fail
  }
}

trackInstallation();
