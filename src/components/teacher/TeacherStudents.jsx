import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Users, Mail, Phone, Calendar, BookOpen, Clock } from 'lucide-react';

export default function TeacherStudents({ department }) {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const studentsSnapshot = await getDocs(collection(db, 'joined_students'));
        let allStudents = studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        
        // Filter by department (ensure case-insensitive match)
        if (department) {
          allStudents = allStudents.filter(student => 
            student.department && student.department.toLowerCase() === department.toLowerCase()
          );
        }

        // Remove duplicates by email
        const uniqueStudents = [];
        const seenEmails = new Set();
        
        allStudents.forEach(student => {
          const email = student.email ? student.email.toLowerCase() : '';
          if (email && !seenEmails.has(email)) {
            seenEmails.add(email);
            uniqueStudents.push(student);
          }
        });

        setStudents(uniqueStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
      setIsLoading(false);
    };

    fetchStudents();
  }, [department]);

  const filteredStudents = students.filter(student => 
    (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (student.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 mb-1">My Students</h2>
          <p className="text-slate-500 font-medium">Students enrolled in {department || 'your department'}</p>
        </div>
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[15px]"
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Users size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No students found</h3>
          <p className="text-slate-500">There are no registered students in this department yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredStudents.map(student => (
            <div key={student.id} className="p-5 border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group bg-slate-50/50 hover:bg-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {(student.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate text-[16px]">{student.name || 'Unknown Student'}</h3>
                  
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    {student.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        <span>{student.phone}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                        <BookOpen size={14} />
                        {student.department || department}
                      </div>
                      {student.year && (
                        <div className="flex items-center gap-1.5 text-[13px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          <Clock size={14} />
                          {student.year}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
