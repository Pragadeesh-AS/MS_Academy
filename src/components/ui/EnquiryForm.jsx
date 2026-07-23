"use client"

import React from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "motion/react"
import { MessageSquarePlus, X, Send } from "lucide-react"
import emailjs from '@emailjs/browser'
import { db } from '../../firebase'
import { collection, addDoc } from 'firebase/firestore'

import { Button } from "./button"

const SPEED_FACTOR = 1

const FormContext = React.createContext({})
const useFormContext = () => React.useContext(FormContext)

export function EnquiryForm() {
  const wrapperRef = React.useRef(null)
  const firstInputRef = React.useRef(null)

  const [showForm, setShowForm] = React.useState(false)
  const [successFlag, setSuccessFlag] = React.useState(false)

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
  }, [])

  const triggerOpen = React.useCallback(() => {
    setShowForm(true)
    setTimeout(() => {
      firstInputRef.current?.focus()
    })
  }, [])

  const handleSuccess = React.useCallback(() => {
    setSuccessFlag(true)
    setTimeout(() => {
      setSuccessFlag(false)
      triggerClose()
    }, 2000)
  }, [triggerClose])

  React.useEffect(() => {
    function clickOutsideHandler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  const ctx = React.useMemo(
    () => ({ showForm, successFlag, triggerOpen, triggerClose }),
    [showForm, successFlag, triggerOpen, triggerClose]
  )

  return (
    <div className="fixed bottom-6 right-6 z-[120] flex items-center justify-center pointer-events-auto" style={{ width: showForm ? FORM_WIDTH : 'auto', height: showForm ? FORM_HEIGHT : 'auto' }}>
      <motion.div
        ref={wrapperRef}
        data-panel
        className={cx(
          "relative flex flex-col items-center overflow-hidden transition-colors duration-300",
          showForm ? "bg-white shadow-2xl border border-slate-200" : "bg-[#1d4ed8] hover:bg-blue-600 shadow-lg border-transparent"
        )}
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : 64,
          height: showForm ? FORM_HEIGHT : 64,
          borderRadius: showForm ? 24 : 32,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <InputForm ref={firstInputRef} onSuccess={handleSuccess} />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext()
  return (
    <footer className="mt-auto flex h-[64px] w-full items-center justify-center whitespace-nowrap select-none">
      <Button
        type="button"
        className="flex h-full w-full items-center justify-center rounded-full p-0 bg-transparent cursor-pointer text-white"
        variant="ghost"
        onClick={triggerOpen}
        disabled={showForm}
      >
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="blank"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              className="h-5 w-5 hidden"
            />
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <MessageSquarePlus size={28} />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </footer>
  )
}

const FORM_WIDTH = 400
const FORM_HEIGHT = 720

const InputForm = React.forwardRef(({ onSuccess }, ref) => {
  const { triggerClose, showForm, successFlag } = useFormContext()

  const [formData, setFormData] = React.useState({
    studentName: "",
    email: "",
    phone: "",
    department: "",
    college: "",
    course: "",
    description: "",
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)

    // 1. Save to Firestore for Admin Dashboard
    try {
      const newQuery = {
        fullName: formData.studentName,
        email: formData.email,
        phone: formData.phone,
        message: `Course: ${formData.course}\nCollege: ${formData.college}\nDept: ${formData.department}\n\nQuery: ${formData.description}`,
        date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'Pending'
      };
      
      await addDoc(collection(db, 'contact_queries'), newQuery);
    } catch (err) {
      console.error("Firestore database error", err);
    }

    // 2. Send Email via EmailJS
    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
      
      if (SERVICE_ID !== 'YOUR_SERVICE_ID') {
        const templateParams = {
          to_email: 'msacademy2026@gmail.com', // Target admin email
          from_name: formData.studentName,
          reply_to: formData.email,
          phone: formData.phone,
          course: formData.course,
          college: formData.college,
          message: formData.description
        };
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      }
    } catch (err) {
      console.error("EmailJS Error:", err);
    }

    setIsSubmitting(false)
    onSuccess()
    setFormData({
      studentName: "",
      email: "",
      phone: "",
      department: "",
      college: "",
      course: "",
      description: "",
    })
  }

  function handleKeys(e) {
    if (e.key === "Escape") triggerClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0 w-full"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence>
        {showForm && !successFlag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col p-6 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h3 className="text-xl font-[900] text-slate-900 tracking-tight">Quick Enquiry</h3>
                <p className="text-xs font-semibold text-slate-500">Ask us anything about our GATE coaching.</p>
              </div>
              <button
                type="button"
                onClick={triggerClose}
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full cursor-pointer hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 overflow-y-auto flex-grow pr-2 custom-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Student Name *</label>
                <input
                  ref={ref}
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your name"
                  onKeyDown={handleKeys}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl h-11 px-4 border border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="name@example.com"
                  onKeyDown={handleKeys}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl h-11 px-4 border border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+91 9876543210"
                  onKeyDown={handleKeys}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl h-11 px-4 border border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Department *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Computer Science, Mechanical"
                  onKeyDown={handleKeys}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl h-11 px-4 border border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">College Name *</label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  required
                  placeholder="Enter your college name"
                  onKeyDown={handleKeys}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl h-11 px-4 border border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">GATE Course Name *</label>
                <input
                  type="text"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  required
                  placeholder="e.g., GATE CSE, GATE ECE"
                  onKeyDown={handleKeys}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl h-11 px-4 border border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Description / Query *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="What would you like to know?"
                  onKeyDown={handleKeys}
                  rows={3}
                  className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all rounded-xl p-4 border border-slate-200 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white rounded-xl bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all border border-[#333333] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <span>Send Enquiry</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successFlag && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10"
          >
            <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Enquiry Sent!</h3>
            <p className="text-sm font-semibold text-slate-500 mt-2">We will get back to you shortly.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
})

export default EnquiryForm

