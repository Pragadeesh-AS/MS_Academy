const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Add LayoutGrid to imports
content = content.replace(
  'Users, FileText, LayoutDashboard, Settings',
  'Users, FileText, LayoutDashboard, LayoutGrid, Settings'
);

// 2. Add Book to imports
content = content.replace(
  'Eye, BookOpen, Clock',
  'Eye, BookOpen, Book, Clock'
);

// 3. Replace Dashboard Icon
content = content.replace(
  '<LayoutDashboard size={20} className={activeTab === \'overview\' ? \'text-[#3b82f6]\' : \'text-[#3b82f6]\'} />',
  '<LayoutGrid size={20} className={activeTab === \'overview\' ? \'text-[#3b82f6]\' : \'text-[#3b82f6]\'} />'
);

// 4. Replace Question Bank Icon
content = content.replace(
  '<BookOpen size={20} className="text-[#0ea5e9]" />',
  '<Book size={20} className="text-[#0ea5e9]" />'
);

fs.writeFileSync('src/components/AdminDashboard.jsx', content);
console.log('Icons updated successfully');
