const fs = require('fs');
let code = fs.readFileSync('e:/PROJECT/MS_Academy/src/components/TestsManager.jsx', 'utf8');

// 1. State change
code = code.replace(/const \[selectedSubject, setSelectedSubject\] = useState\(''\);/, 'const [selectedSubjects, setSelectedSubjects] = useState([]);');

// 2. Remove old selectedSubjectEntry logic
code = code.replace(/const selectedSubjectEntry = subjectsList\.find[\s\S]*?const selectedCommonDept = [^;]+;/, `  // New question dept matcher that supports multiple subjects
  const questionDeptMatches = (qDept, qSubject) => {
    const subEntry = subjectsList.find(s => (s.name || '').trim().toLowerCase() === (qSubject || '').trim().toLowerCase());
    if (subEntry && subEntry.commonDept) {
      return (qDept || '').trim().toLowerCase() === (subEntry.commonDept.name || '').trim().toLowerCase() || matchesSelectedDept(qDept);
    }
    return matchesSelectedDept(qDept);
  };`);

// Remove old questionDeptMatches
code = code.replace(/\s*\/\/ Questions for a common subject[\s\S]*?const questionDeptMatches = \(value\) => \([\s\S]*?matchesSelectedDept\(value\)\s*\);/, '');

// 3. Update topicsList
code = code.replace(/const topicsList = attributes\s*\.filter\(a => a\.type === 'topic' && \(\!selectedSubjectObj \|\| a\.parentId === selectedSubjectObj\.id\)\)\s*\.map\(a => a\.name\);/, `  const topicsList = attributes
    .filter(a => a.type === 'topic' && (selectedSubjects.length === 0 || selectedSubjects.some(subName => {
      const subEntry = subjectsList.find(s => s.name === subName);
      return subEntry && a.parentId === subEntry.attr.id;
    })))
    .map(a => a.name);`);

// 4. Update getTopicCounts
code = code.replace(/questionDeptMatches\(q\.department\) &&\s*\(q\.subject \|\| ''\)\.trim\(\)\.toLowerCase\(\) === \(selectedSubject \|\| ''\)\.trim\(\)\.toLowerCase\(\)/g, "questionDeptMatches(q.department, q.subject) && selectedSubjects.some(sub => (q.subject || '').trim().toLowerCase() === sub.toLowerCase())");

// 5. Update availablePool filter
code = code.replace(/if \(selectedDept && \!questionDeptMatches\(q\.department\)\) return false;\s*if \(selectedSubject && \(q\.subject \|\| ''\)\.trim\(\)\.toLowerCase\(\) !== selectedSubject\.trim\(\)\.toLowerCase\(\)\) return false;/g, "if (selectedDept && !questionDeptMatches(q.department, q.subject)) return false;\n      if (selectedSubjects.length > 0 && !selectedSubjects.some(sub => (q.subject || '').trim().toLowerCase() === sub.toLowerCase())) return false;");

// 6. Update getStep2Warning
code = code.replace(/if \(\!selectedSubject\) return "Please select a subject";/, "if (selectedSubjects.length === 0) return 'Please select at least one subject';");

// 7. Update Payload creation
code = code.replace(/subject: selectedSubject \|\| 'General',/, "subject: selectedSubjects.join(', ') || 'General',");

// 8. Update Reset logic
code = code.replace(/setSelectedSubject\(''\);/, 'setSelectedSubjects([]);');

// 9. Update Load logic
code = code.replace(/setSelectedSubject\(test\.subject && test\.subject !== 'General' \? test\.subject : ''\);/, "setSelectedSubjects(test.subject && test.subject !== 'General' ? test.subject.split(',').map(s => s.trim()).filter(Boolean) : []);");

// 10. Update UI Dept onClick reset
code = code.replace(/setSelectedDept\(fullName\); setSelectedSubject\(''\); setSelectedTopics\(\[\]\);/g, 'setSelectedDept(fullName); setSelectedSubjects([]); setSelectedTopics([]);');

// 11. Update UI Subject Buttons
code = code.replace(/\{subjectsList\.map\(sub => \{\s*const isSelected = selectedSubject === sub\.name;\s*return \(\s*<button[\s\S]*?onClick=\{.*?\}\s*className={`px-4/g, `{subjectsList.map(sub => {
                            const isSelected = selectedSubjects.includes(sub.name);
                            return (
                              <button
                                key={sub.attr.id}
                                type="button"
                                onClick={() => { 
                                  setSelectedSubjects(prev => {
                                    if (prev.includes(sub.name)) {
                                      return prev.filter(s => s !== sub.name);
                                    } else {
                                      return [...prev, sub.name];
                                    }
                                  });
                                }}
                                className={\`px-4`);

// 12. Update Select Topics conditional rendering
code = code.replace(/\{selectedSubject && \(/, '{selectedSubjects.length > 0 && (');
code = code.replace(/\{selectedSubject\}/g, '{selectedSubjects.join(", ")}');

fs.writeFileSync('e:/PROJECT/MS_Academy/src/components/TestsManager.jsx', code);
console.log("Refactoring done!");
