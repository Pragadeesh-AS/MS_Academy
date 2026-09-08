const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

admin.initializeApp();

exports.generateAgoraToken = onRequest({ cors: true }, (request, response) => {
    // using built-in v2 cors or the manual cors middleware
    cors(request, response, () => {
        try {
            // Get inputs from the request body or query params
            const channelName = request.body.channelName || request.query.channelName;
            const uid = request.body.uid || request.query.uid || 0;
            let roleParam = request.body.role || request.query.role || 'publisher';

            if (!channelName) {
                return response.status(400).json({ error: 'channelName is required' });
            }

            // Get App ID and App Certificate from environment variables
            // You can configure these in Firebase using:
            // firebase functions:config:set agora.app_id="YOUR_APP_ID" agora.app_certificate="YOUR_CERT"
            // For this implementation, we can use process.env if you prefer, or functions.config()
            // Using the hardcoded values from your project temporarily for ease of use, 
            // but you should move these to Firebase config or Secret Manager in production.
            const appId = "1277c3a43556496b8869c5b0f87d189f"; // Replace with functions.config().agora.app_id
            const appCertificate = "756e187c157d4519b3b72c8c7ba47833"; // Replace with functions.config().agora.app_certificate

            let role;
            if (roleParam === 'publisher') {
                role = RtcRole.PUBLISHER;
            } else if (roleParam === 'subscriber') {
                role = RtcRole.SUBSCRIBER;
            } else {
                return response.status(400).json({ error: 'Invalid role. Must be publisher or subscriber' });
            }

            const expireTime = request.query.expireTime || request.body.expireTime || 3600 * 24; // Default to 24 hours
            const currentTime = Math.floor(Date.now() / 1000);
            const privilegeExpireTime = currentTime + parseInt(expireTime, 10);

            // Build token with uid
            const token = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                uid,
                role,
                privilegeExpireTime
            );

            // Return the generated token
            return response.status(200).json({ token: token });
        } catch (error) {
            console.error("Error generating token:", error);
            return response.status(500).json({ error: "Internal Server Error while generating token" });
        }
    });
});
