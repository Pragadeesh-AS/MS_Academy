import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;

// 1. Paste your App ID and App Certificate here:
const appId = "1277c3a43556496b8869c5b0f87d189f"; // Your App ID
const appCertificate = "756e187c157d4519b3b72c8c7ba47833"; // Click the 'copy' icon next to Primary Certificate in Agora

const channelName = "MS_ACADEMY";
const uid = 0;
const role = RtcRole.PUBLISHER;

// Set expiration to 10 years in the future (virtually permanent for development)
const expirationTimeInSeconds = 3600 * 24 * 365 * 10; 
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

if (appCertificate === "PASTE_YOUR_APP_CERTIFICATE_HERE") {
    console.error("\n❌ ERROR: You need to paste your App Certificate into this file first!\n");
    process.exit(1);
}

const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);

console.log("\n✅ SUCCESS! Here is your 10-year permanent token:\n");
console.log(token);
console.log("\n👉 Copy the above token and paste it into your .env file as VITE_AGORA_TEMP_TOKEN\n");
