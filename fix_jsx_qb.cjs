const fs = require('fs');
const file = 'src/components/admin/QuestionBank.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // The very last '</div>' before the end of the component needs to be '</>'
    // Let's replace the last occurrence of '</div>' with '</>'
    const lastDivIndex = content.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
        content = content.substring(0, lastDivIndex) + '</>' + content.substring(lastDivIndex + 6);
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed JSX closing tag.");
}
