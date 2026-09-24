
const fs = require('fs');
const https = require('https');
const path = require('path');

const baseUrl = 'https://tcsion.com/OnlineAssessment/ScientificCalculator/';
const targetDir = path.join(process.cwd(), 'public', 'calculator');

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      if (dest.endsWith('.html') || dest.endsWith('.js') || dest.endsWith('.css')) {
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          fs.writeFileSync(dest, data);
          resolve(data);
        });
      } else {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', err => reject(err));
  });
}

(async () => {
  console.log('Downloading HTML...');
  const html = await download(baseUrl + 'Calculator.html', path.join(targetDir, 'Calculator.html'));
  
  const cssRegex = /href=['"](.*?\.css)['"]/g;
  const jsRegex = /src=['"](.*?\.js)['"]/g;
  
  let match;
  while ((match = cssRegex.exec(html)) !== null) {
    const file = match[1];
    console.log('CSS:', file);
    if (!fs.existsSync(path.dirname(path.join(targetDir, file)))) fs.mkdirSync(path.dirname(path.join(targetDir, file)), { recursive: true });
    await download(baseUrl + file, path.join(targetDir, file));
  }
  
  while ((match = jsRegex.exec(html)) !== null) {
    const file = match[1];
    console.log('JS:', file);
    if (!fs.existsSync(path.dirname(path.join(targetDir, file)))) fs.mkdirSync(path.dirname(path.join(targetDir, file)), { recursive: true });
    await download(baseUrl + file, path.join(targetDir, file));
  }
  
  // also get jquery image if there's any CSS image
  // For TCS iON calc, there's usually a background image or close image. Let's just grab images directory.
  // Actually, we'll see if it works without images first.
  console.log('Done!');
})();

