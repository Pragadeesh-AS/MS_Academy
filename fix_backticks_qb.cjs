const fs = require('fs');
const file = 'src/components/admin/QuestionBank.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed backticks and dollar signs in QB.");
}
