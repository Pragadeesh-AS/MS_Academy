import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, User, ChevronRight, ChevronLeft, Info, HelpCircle } from 'lucide-react';

export default function GateTestInterface({ test, testQuestions, onSubmit, onCancel, studentName }) {
  const [mode, setMode] = useState('login'); // login, instructions1, instructions2, taking
  
  // Login State
  const [loginId, setLoginId] = useState('11111');
  const [password, setPassword] = useState('*****');
  
  // Instructions State
  const [agreed, setAgreed] = useState(false);

  // Taking State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [flagged, setFlagged] = useState([]);
  const [visited, setVisited] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    // Do not start timer until mode === 'taking'
    if (mode === 'taking') {
      setTimeRemaining(test.duration * 60);
      setVisited([testQuestions[0]?.id]);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            onSubmit(selectedAnswers);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSelectOption = (qId, option) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleClearResponse = () => {
    const qId = testQuestions[currentIdx].id;
    setSelectedAnswers(prev => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const handleMarkReviewNext = () => {
    const qId = testQuestions[currentIdx].id;
    if (!flagged.includes(qId)) setFlagged([...flagged, qId]);
    goToNextQuestion();
  };

  const handleSaveNext = () => {
    const qId = testQuestions[currentIdx].id;
    setFlagged(flagged.filter(id => id !== qId)); // Remove flag if explicitly saved
    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    if (currentIdx < testQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      const nextId = testQuestions[currentIdx + 1].id;
      if (!visited.includes(nextId)) setVisited([...visited, nextId]);
    }
  };
  
  const jumpToQuestion = (idx) => {
    setCurrentIdx(idx);
    const qId = testQuestions[idx].id;
    if (!visited.includes(qId)) setVisited([...visited, qId]);
  };

  const submitExam = () => {
    setShowConfirmModal(true);
  };

  const confirmSubmit = () => {
    setShowConfirmModal(false);
    if (timerRef.current) clearInterval(timerRef.current);
    onSubmit(selectedAnswers);
  };

  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (qId) => {
    if (!visited.includes(qId)) return 'not_visited';
    const hasAnswer = !!selectedAnswers[qId];
    const isFlagged = flagged.includes(qId);
    
    if (hasAnswer && isFlagged) return 'answered_marked';
    if (!hasAnswer && isFlagged) return 'marked';
    if (hasAnswer) return 'answered';
    return 'not_answered';
  };

  // ----------------------------------------------------
  // SUB-COMPONENTS
  // ----------------------------------------------------

  const Header = ({ showSystemInfo = true }) => (
    <div className="bg-[#2D66B3] text-white flex flex-col font-sans">
      <div className="bg-white flex justify-center py-2 relative">
        <h1 className="text-[#364968] text-xl font-bold uppercase">GRADUATE APTITUDE TEST IN ENGINEERING (GATE 2026)</h1>
        <p className="absolute bottom-1 text-[#364968] text-xs font-semibold">Organizing Institute : INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI</p>
      </div>
      {showSystemInfo && (
        <div className="flex justify-between items-center px-4 py-2 bg-[#6B6B6B] border-t border-[#444]">
          <div>
            <div className="text-white text-sm">System Name :</div>
            <div className="text-[#FFEA00] text-2xl font-bold">C001</div>
            <div className="text-white text-xs mt-1">Kindly contact the invigilator if there are any discrepancies in the Name and Photograph displayed on the screen or if the photograph is not yours</div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-white text-sm">Candidate Name :</div>
              <div className="text-[#FFEA00] text-xl font-bold">{studentName || 'John Smith'}</div>
              <div className="text-white text-sm mt-1">Subject : <span className="text-[#00FF00] font-bold">{test.title}</span></div>
            </div>
            <div className="w-20 h-20 bg-white p-1 border border-gray-400">
               <User className="w-full h-full text-slate-400 bg-slate-100" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const LoginScreen = () => (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="bg-[#EBEBEB] border border-gray-300 w-80 shadow-sm rounded-sm">
          <div className="bg-[#D1D1D1] text-gray-700 font-bold px-4 py-2 text-sm border-b border-gray-300">Login</div>
          <div className="p-6 space-y-4">
            <div className="flex bg-white border border-gray-300">
              <div className="bg-gray-100 p-2 border-r border-gray-300"><User size={20} className="text-gray-500" /></div>
              <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-2 outline-none text-sm" />
            </div>
            <div className="flex bg-white border border-gray-300">
              <div className="bg-gray-100 p-2 border-r border-gray-300"><HelpCircle size={20} className="text-gray-500" /></div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-2 outline-none text-sm" />
            </div>
            <button onClick={() => setMode('instructions1')} className="w-full bg-[#3EA9F5] hover:bg-[#2B8CCF] text-white py-2 text-sm font-bold mt-2">Sign In</button>
          </div>
        </div>
      </div>
      <div className="bg-[#5B7184] text-white text-center py-1 text-xs">Version : 17.07.00</div>
    </div>
  );

  const InstructionsLayout = ({ children, title, onNext, onPrev, onReady, showNext, showPrev, isReady }) => {
    const [agreed, setAgreed] = useState(false);
  
    return (
      <div className="fixed inset-0 z-50 bg-white text-black flex flex-col font-sans overflow-hidden">
        {/* Top Header */}
        <header className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <h1 className="font-bold text-[#2A4B7C] text-lg tracking-wide uppercase">GRADUATE APTITUDE TEST IN ENGINEERING (GATE 2026)</h1>
                <p className="text-xs text-gray-600">Organizing Institute : INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI</p>
              </div>
            </div>
          </div>
        </header>
  
        <div className="bg-[#D9EAF7] text-[#1a5b82] font-bold px-4 py-2 text-sm border-b border-gray-300">
          {title}
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-gray-300">
            <div className="flex-1 p-8 overflow-y-auto">
              {children}
              {showNext && (
                <div className="mt-8 flex justify-end border-t border-gray-200 pt-4">
                  <button onClick={onNext} className="border border-gray-400 px-6 py-2 flex items-center gap-2 hover:bg-gray-50 text-sm font-bold bg-white">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            {(showPrev || isReady) && (
              <div className="bg-white border-t border-gray-200 p-4 shrink-0 flex flex-col gap-4">
                {isReady && (
                  <div className="flex items-start gap-2 border-b border-gray-100 pb-4">
                    <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1" />
                    <label htmlFor="agree" className="text-[11px] text-gray-700 leading-tight">
                      I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of/not wearing/not carrying any prohibited gadget like mobile phone, Bluetooth devices etc./any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests/Examinations.
                    </label>
                  </div>
                )}
                <div className="flex items-center relative">
                  {showPrev && (
                    <button onClick={onPrev} className="border border-gray-300 px-4 py-1.5 flex items-center gap-1 hover:bg-gray-50 text-sm font-bold absolute left-0 bg-white shadow-sm">
                      <ChevronLeft size={16} /> Previous
                    </button>
                  )}
                  {isReady && (
                    <div className="flex-1 flex justify-center">
                      <button onClick={onReady} disabled={!agreed} className={`px-8 py-2 text-white font-bold text-sm shadow-sm ${agreed ? 'bg-[#1589C9] hover:bg-[#1070A6]' : 'bg-[#1589C9] opacity-80 cursor-not-allowed'}`}>
                        I am ready to begin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="w-[250px] bg-white p-6 flex flex-col items-center border-l border-gray-300 shrink-0">
            <div className="w-24 h-24 bg-white p-1 border border-gray-300 shadow-sm mb-4">
              <User className="w-full h-full text-slate-400 bg-slate-100" />
            </div>
            <div className="text-[#364968] font-bold text-sm text-center">{studentName || 'Student'}</div>
          </div>
        </div>
        <div className="bg-[#5B7184] text-white text-center py-1 text-xs z-10">Version : 17.07.00</div>
      </div>
    );
  };

  const Instructions1 = () => (
    <InstructionsLayout 
      title="Instructions" 
      showNext={true} 
      onNext={() => setMode('instructions2')}
    >
      <div className="max-w-4xl mx-auto space-y-4 text-sm text-gray-800">
        <h2 className="text-center font-bold text-lg mb-6">General Instructions</h2>
        <p className="font-bold">Please read the following carefully.</p>
        <ol className="list-decimal pl-5 space-y-4">
          <li>The duration of the examination is <strong>{test.duration} minutes</strong>. The clock will be set on the server. The countdown timer at the top right-hand corner of your screen displays the time available for you to complete the examination.</li>
          <li>When the timer reaches zero, the examination will end automatically. You will NOT be required to submit your examination.</li>
          <li>The screen is divided in two panels. The panel on the left shows the Questions and the panel on the right has Question Palette and Question numbers.</li>
          <li>
            The Question Palette shows the status of each question using one of the following symbols:
            <ul className="mt-4 space-y-2 border border-gray-400 p-0">
              <li className="flex items-center gap-3 border-b border-gray-400 p-2"><div className="w-8 h-8 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-md font-bold">1</div> You have NOT visited the question yet.</li>
              <li className="flex items-center gap-3 border-b border-gray-400 p-2"><div className="w-8 h-8 flex items-center justify-center bg-red-500 text-white clip-not-answered font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)'}}>2</div> You have NOT answered the question.</li>
              <li className="flex items-center gap-3 border-b border-gray-400 p-2"><div className="w-8 h-8 flex items-center justify-center bg-green-500 text-white clip-answered font-bold" style={{clipPath: 'polygon(0 25%, 50% 0, 100% 25%, 100% 100%, 0 100%)'}}>3</div> You have answered the question. <strong>This will be evaluated.</strong></li>
              <li className="flex items-center gap-3 border-b border-gray-400 p-2"><div className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full font-bold">4</div> You have NOT answered the question but marked it for review.</li>
              <li className="flex items-center gap-3 p-2"><div className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full font-bold relative">5 <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div></div> You have answered the question and marked it for review. <strong>This will also be evaluated.</strong></li>
            </ul>
          </li>
          <li>Click on <strong className="font-bold border border-gray-400 px-1 mx-1">&gt;</strong> to collapse the Question No. panel and maximize the question window. To undo, click on <strong className="font-bold border border-gray-400 px-1 mx-1">&lt;</strong>.</li>
          <li>A <strong>scientific calculator</strong> is available on the left of your image.</li>
          <li><strong>Marking:</strong> Each question carries either one mark or two marks, as specified. Questions that are not attempted will result in ZERO marks.</li>
          <li><strong>Scribble Pad:</strong> You may use the scribble pad provided in the examination hall for rough work. Write your name and registration number on the scribble pad before using it. You can possess ONLY one scribble pad at any point of time. You may ask for a second scribble pad only after returning the first one to the invigilator. Return the scribble pad in your possession to the invigilator at the end of the examination.</li>
        </ol>
        
        <h3 className="font-bold mt-6 mb-2 text-base">Navigating through sections</h3>
        <ol className="list-decimal pl-5 space-y-4" start="9">
          <li>This question paper has more than one sections. The details of the Sections are given in the Paper Specific instructions.</li>
          <li>Name of the Sections in the question paper are displayed at the top left of the Questions Panel.</li>
          <li>Questions in a section can be viewed by clicking on the section heading/tab. The tab of the section you are currently viewing is highlighted.</li>
          <li>Clicking the <strong>Save & Next button</strong> on the last question for a section will take you to the first question of the next section.</li>
          <li>You can switch between sections and questions anytime during the examination by clicking on the appropriate tab.</li>
          <li>You can view the section summary above the question palette.</li>
        </ol>

        <h3 className="font-bold mt-6 mb-2 text-base">Navigating to a question</h3>
        <ol className="list-decimal pl-5 space-y-4" start="15">
          <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
          <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
          <li>To navigate/go to a question, click on its question number in the Question Palette. <span className="text-red-600">This does NOT save your answer to the current question.</span></li>
        </ol>

        <h3 className="font-bold mt-6 mb-2 text-base">Answering a Question</h3>
        <ol className="list-decimal pl-5 space-y-4" start="18">
          <li><strong>Each Multiple Choice Question (MCQ) and Multiple Select Question (MSQ)</strong> has four options.</li>
          <li>
            <strong>Multiple Choice Questions (MCQs):</strong>
            <ol className="list-[lower-alpha] pl-5 mt-2 space-y-2">
              <li>MCQ has only one correct answer. Wrong answers for MCQs will result in NEGATIVE marks: ⅓ negative mark for a 1-mark question; and ⅔ negative mark for a 2-mark question.</li>
              <li>MCQs have a circular button for each option.</li>
              <li>To select your answer, click on the circular button of one of the option that you want to choose as answer.</li>
              <li>To change your chosen answer, click on the button of another option.</li>
              <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
            </ol>
          </li>
          <li>
            <strong>Multiple Select Questions (MSQs)</strong>
            <ol className="list-[lower-alpha] pl-5 mt-2 space-y-2">
              <li>MSQ has one or more correct options. There is no negative marking for MSQs.</li>
              <li>MSQs have square-shaped checkbox placed before each option.</li>
              <li>Choose your answer by clicking the checkbox(es) placed before each of the selected choice(s).</li>
              <li>To change a particular selected option, deselect the option that you want to change and click on the checkbox of another option.</li>
              <li>To deselect one or more of your selected option(s), either click on the checkbox of the option(s) again or click on the <strong>Clear Response</strong> button.</li>
            </ol>
          </li>
          <li>
            <strong>Numerical Answer Type (NAT) questions</strong>
            <ol className="list-[lower-alpha] pl-5 mt-2 space-y-2">
              <li>To enter a numerical answer, use the virtual numeric keypad that appears below the question.</li>
              <li>To clear your answer, click on the <strong>Clear Response</strong> button.</li>
            </ol>
          </li>
        </ol>
      </div>
    </InstructionsLayout>
  );

  const Instructions2 = () => {
    return (
      <InstructionsLayout title="Other Important Instructions" onPrev={() => setMode('instructions1')} onReady={() => setMode('taking')} showPrev isReady>
        <div className="max-w-4xl mx-auto space-y-4 text-sm text-gray-900 pb-10">
          <h2 className="text-center font-bold text-lg mb-6">{test?.subject || 'Paper'}-specific instructions</h2>
          <p className="font-bold mt-4">Please read the following carefully.</p>
          <p>This question paper has {testQuestions?.length || 0} questions. The marks distribution is as specified in each question.</p>
          <p className="mt-4 text-red-600 font-bold">Warning: Do not click refresh or back button during the examination.</p>
        </div>
      </InstructionsLayout>
    );
  };

  const TakingScreen = () => {
    const currentQ = testQuestions[currentIdx];
    
    // Calculate stats
    const stats = {
      answered: 0,
      not_answered: 0,
      not_visited: testQuestions.length,
      marked: 0,
      answered_marked: 0
    };
    
    testQuestions.forEach(q => {
      const s = getQuestionStatus(q.id);
      if (s !== 'not_visited') {
        stats.not_visited--;
        stats[s]++;
      }
    });

    const isEmptyHtml = (html) => {
      if (!html) return true;
      const stripped = html.replace(/<[^>]*>?/gm, '').trim();
      return stripped === '';
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#F5F5F5] text-black flex flex-col font-sans select-none">
        {/* Header */}
        <div className="bg-[#2D66B3] text-white flex justify-center py-2 border-b border-gray-400 relative">
          <h1 className="text-[#364968] bg-white px-20 py-1 text-xl font-bold uppercase rounded-sm shadow-sm">GRADUATE APTITUDE TEST IN ENGINEERING (GATE 2026)</h1>
        </div>
        
        <div className="bg-[#444444] text-white flex items-center justify-between px-4 py-1 text-sm border-b border-gray-500">
          <div className="font-bold truncate max-w-xl">{test.title}</div>
          <div className="flex gap-4">
            <button className="flex items-center gap-1 bg-[#1589C9] px-2 py-0.5 rounded-sm"><Info size={14}/> Instructions</button>
            <button className="flex items-center gap-1 bg-[#1589C9] px-2 py-0.5 rounded-sm">Question Paper</button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-400 bg-white">
            <div className="flex bg-[#EAF2FA] border-b border-gray-300 text-sm">
              <div className="px-4 py-1.5 bg-[#1589C9] text-white font-bold border-r border-gray-300 flex items-center gap-2">
                All Sections <Info size={14} className="bg-white text-[#1589C9] rounded-full"/>
              </div>
            </div>
            
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-300 text-sm font-bold">
              <div>Question Type: {currentQ?.questionType === 'Fill in the Blank' ? 'NAT' : 'MCQ'}</div>
              <div className="font-normal text-gray-600">Marks for correct answer: <span className="text-green-600">{currentQ?.mark || '1'}</span> | Negative Marks: <span className="text-red-500">{currentQ?.negativeMark || '0'}</span></div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              <div className="font-bold mb-4 text-base">Question No. {currentIdx + 1}</div>
              <div className="mb-6">
                {isEmptyHtml(currentQ?.questionText) && !currentQ?.questionImageUrl ? (
                  <div className="text-red-500 italic p-4 bg-red-50 border border-red-200 rounded">
                    This question has no text or image content. It may have been saved empty in the Question Bank.
                  </div>
                ) : (
                  <div className="text-base leading-relaxed overflow-hidden q-content" dangerouslySetInnerHTML={{ __html: currentQ?.questionText || '' }} />
                )}
                {currentQ?.questionImageUrl && (
                  <img src={currentQ.questionImageUrl} alt="Question Graphic" className="mt-4 max-w-full" />
                )}
              </div>
              
              <div className="space-y-4">
                {currentQ?.questionType === 'Fill in the Blank' ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={selectedAnswers[currentQ.id] || ''}
                      onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                      className="border border-gray-400 p-2 w-48 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const text = currentQ?.[`option${opt}`];
                      const img = currentQ?.[`option${opt}Image`];
                      if (isEmptyHtml(text) && !img) return null;
                      return (
                        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name={`q_${currentQ.id}`}
                            checked={selectedAnswers[currentQ.id] === opt}
                            onChange={() => handleSelectOption(currentQ.id, opt)}
                            className="mt-1 accent-blue-600 w-4 h-4"
                          />
                          <div>
                            {text && <span className="text-sm block" dangerouslySetInnerHTML={{ __html: text }} />}
                            {img && <img src={img} alt={`Option ${opt}`} className="mt-2 max-h-24 border border-gray-200" />}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-gray-300 p-3 flex justify-between bg-gray-50">
              <div className="flex gap-3">
                <button onClick={handleMarkReviewNext} className="border border-gray-400 px-4 py-1.5 text-sm hover:bg-gray-100 bg-white shadow-sm font-bold text-gray-700">Mark for Review & Next</button>
                <button onClick={handleClearResponse} className="border border-gray-400 px-4 py-1.5 text-sm hover:bg-gray-100 bg-white shadow-sm font-bold text-gray-700">Clear Response</button>
              </div>
              <button onClick={handleSaveNext} className="bg-[#1589C9] hover:bg-[#1070A6] text-white px-6 py-1.5 text-sm font-bold shadow-sm">Save & Next</button>
            </div>
          </div>
          
          {/* Right Panel */}
          <div className="w-[280px] bg-[#EAF2FA] flex flex-col">
            <div className="flex p-3 bg-white border-b border-gray-300 gap-3">
              <div className="w-16 h-16 border border-gray-300 bg-gray-50 flex items-center justify-center"><User className="text-gray-400 w-12 h-12"/></div>
              <div>
                <div className="text-xs text-gray-500 font-bold">Time Left : <span className="text-gray-800 text-sm">{formatTimer(timeRemaining)}</span></div>
                <div className="font-bold text-sm text-[#364968] mt-1">{studentName || 'John Smith'}</div>
              </div>
            </div>

            <div className="p-3 bg-white border-b border-gray-300 grid grid-cols-2 gap-y-2 gap-x-2 text-[10px] text-gray-700 font-bold">
              <div className="flex items-center gap-2"><div className="w-6 h-6 flex justify-center items-center bg-green-500 text-white" style={{clipPath: 'polygon(0 25%, 50% 0, 100% 25%, 100% 100%, 0 100%)'}}>{stats.answered}</div> Answered</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 flex justify-center items-center bg-red-500 text-white" style={{clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)'}}>{stats.not_answered}</div> Not Answered</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 flex justify-center items-center bg-gray-200 border border-gray-400 rounded-sm">{stats.not_visited}</div> Not Visited</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 flex justify-center items-center bg-purple-600 text-white rounded-full">{stats.marked}</div> Marked for Review</div>
              <div className="flex items-center gap-2 col-span-2"><div className="w-6 h-6 flex justify-center items-center bg-purple-600 text-white rounded-full relative">{stats.answered_marked} <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div></div> Answered & Marked for Review (will also be evaluated)</div>
            </div>

            <div className="bg-[#1589C9] text-white px-3 py-1.5 font-bold text-sm">All Sections</div>
            <div className="p-1 bg-[#86B4D6] text-white text-xs font-bold text-center">Choose a Question</div>
            
            <div className="flex-1 overflow-y-auto p-3 bg-[#EAF2FA]">
              <div className="flex flex-wrap gap-2">
                {testQuestions.map((q, idx) => {
                  const s = getQuestionStatus(q.id);
                  let styleClass = "w-8 h-8 flex justify-center items-center font-bold text-sm cursor-pointer shadow-sm";
                  let extra = null;

                  if (s === 'not_visited') styleClass += " bg-gray-200 border border-gray-400 rounded-sm hover:bg-gray-300 text-black";
                  if (s === 'not_answered') styleClass += " bg-red-500 text-white hover:bg-red-600";
                  if (s === 'answered') styleClass += " bg-green-500 text-white hover:bg-green-600";
                  if (s === 'marked') styleClass += " bg-purple-600 text-white rounded-full hover:bg-purple-700";
                  if (s === 'answered_marked') {
                    styleClass += " bg-purple-600 text-white rounded-full hover:bg-purple-700 relative";
                    extra = <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>;
                  }

                  // apply clip paths for answered / not answered
                  let style = {};
                  if (s === 'answered') style.clipPath = 'polygon(0 25%, 50% 0, 100% 25%, 100% 100%, 0 100%)';
                  if (s === 'not_answered') style.clipPath = 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)';

                  return (
                    <div key={q.id} onClick={() => jumpToQuestion(idx)} className={styleClass} style={style}>
                      {idx + 1}
                      {extra}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-3 bg-[#C5EAF8] border-t border-[#86B4D6]">
              <button onClick={submitExam} className="w-full bg-[#5BC0DE] hover:bg-[#31B0D5] text-white font-bold py-2 rounded-sm shadow-sm border border-[#46B8DA]">Submit</button>
            </div>
          </div>
        </div>
        
        <div className="bg-[#5B7184] text-white text-center py-1 text-xs z-10">Version : 17.07.00</div>
        
        {/* Custom Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans text-black">
            <div className="bg-white rounded-md shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-blue-600 text-white px-4 py-3 font-bold text-lg border-b">Confirm Submission</div>
              <div className="p-6">
                <p className="text-gray-800 text-base mb-2">
                  You have answered {Object.keys(selectedAnswers).length} of {testQuestions.length} questions.
                </p>
                <p className="font-bold text-gray-900 mb-6">Are you sure you want to submit the exam?</p>
                
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">Cancel</button>
                  <button onClick={confirmSubmit} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition">Yes, Submit Exam</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <>
      {mode === 'login' && <LoginScreen />}
      {mode === 'instructions1' && <Instructions1 />}
      {mode === 'instructions2' && <Instructions2 />}
      {mode === 'taking' && <TakingScreen />}
    </>,
    document.body
  );
}
