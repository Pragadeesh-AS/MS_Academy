import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/\r/g, '');
  }
});

const projectId = envVars.VITE_FIREBASE_PROJECT_ID;
const apiKey = envVars.VITE_FIREBASE_API_KEY;

async function deleteTests() {
  console.log("Fetching tests via REST API...");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tests?key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    console.error("Failed to fetch:", response.status, await response.text());
    return;
  }
  
  const data = await response.json();
  if (!data.documents || data.documents.length === 0) {
    console.log("No tests found to delete.");
    return;
  }
  
  console.log(`Found ${data.documents.length} tests. Deleting...`);
  let count = 0;
  for (const doc of data.documents) {
    const docName = doc.name; // This is the full path: projects/msgate.../tests/docId
    const delUrl = `https://firestore.googleapis.com/v1/${docName}?key=${apiKey}`;
    const delRes = await fetch(delUrl, { method: 'DELETE' });
    if (delRes.ok) {
      count++;
      console.log(`Deleted test ${count}/${data.documents.length}: ${docName.split('/').pop()}`);
    } else {
      console.error(`Failed to delete ${docName}:`, await delRes.text());
    }
  }
  
  console.log("All tests successfully deleted.");
}

deleteTests().catch(console.error);
