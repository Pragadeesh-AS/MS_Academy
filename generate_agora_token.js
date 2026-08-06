import fs from 'fs';
import path from 'path';
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;

// 1. Paste your App ID and App Certificate here:
const appId = "1277c3a43556496b8869c5b0f87d189f"; // Your App ID
const appCertificate = "756e187c157d4519b3b72c8c7ba47833"; // Click the 'copy' icon next to Primary Certificate in Agora

const channelName = "MS_ACADEMY";
const uid = 0;
const role = RtcRole.PUBLISHER;

// Set expiration to 24 hours
const expirationTimeInSeconds = 3600 * 24; 
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

if (appCertificate === "PASTE_YOUR_APP_CERTIFICATE_HERE") {
    console.error("\n❌ ERROR: You need to paste your App Certificate into this file first!\n");
    process.exit(1);
}

const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);

// Automatically update the .env file
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('VITE_AGORA_TEMP_TOKEN=')) {
        envContent = envContent.replace(/VITE_AGORA_TEMP_TOKEN=.*/g, `VITE_AGORA_TEMP_TOKEN=${token}`);
    } else {
        envContent += `\nVITE_AGORA_TEMP_TOKEN=${token}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("\n✅ SUCCESS! New 24-hour Agora token generated and injected directly into your .env file!\n");
} else {
    console.error("\n❌ ERROR: .env file not found! Please create one first.\n");
}
