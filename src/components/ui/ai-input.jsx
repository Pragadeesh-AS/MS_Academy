"use client"

import React from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "./button"
import { cn } from "../../lib/utils"

const ColorOrb = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: "oklch(95% 0.02 264.695)",
    accent1: "oklch(75% 0.15 350)",
    accent2: "oklch(80% 0.12 200)",
    accent3: "oklch(78% 0.14 280)",
  }

  const palette = { ...fallbackTones, ...tones }
  const dimValue = parseInt(dimension.replace("px", ""), 10)

  const blurStrength = dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4)
  const contrastStrength = dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5)
  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1)
  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2)
  const maskRadius = dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%"
  const adjustedContrast = dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength

  return (
    <div
      className={cn("color-orb", className)}
      style={{
        width: dimension,
        height: dimension,
        "--base": palette.base,
        "--accent1": palette.accent1,
        "--accent2": palette.accent2,
        "--accent3": palette.accent3,
        "--spin-duration": `${spinDuration}s`,
        "--blur": `${blurStrength}px`,
        "--contrast": adjustedContrast,
        "--dot": `${pixelDot}px`,
        "--shadow": `${shadowRange}px`,
        "--mask": maskRadius,
      }}
    >
      <style>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        .color-orb[style*="--mask: 0%"]::after {
          mask-image: none;
        }

        .color-orb:not([style*="--mask: 0%"])::after {
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

const SPEED_FACTOR = 1

const FormContext = React.createContext({})
const useFormContext = () => React.useContext(FormContext)

export function MorphPanel() {
  const wrapperRef = React.useRef(null)
  const textareaRef = React.useRef(null)

  const [showForm, setShowForm] = React.useState(false)
  const [successFlag, setSuccessFlag] = React.useState(false)

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
    textareaRef.current?.blur()
  }, [])

  const triggerOpen = React.useCallback(() => {
    setShowForm(true)
    setTimeout(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const handleSuccess = React.useCallback(() => {
    triggerClose()
    setSuccessFlag(true)
    setTimeout(() => setSuccessFlag(false), 1500)
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
          showForm ? "bg-white shadow-2xl border border-slate-200" : "bg-transparent border-transparent"
        )}
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : 56,
          height: showForm ? FORM_HEIGHT : 56,
          borderRadius: showForm ? 14 : 28,
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
          <InputForm ref={textareaRef} onSuccess={handleSuccess} />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext()
  return (
    <footer className="mt-auto flex h-[56px] w-full items-center justify-center whitespace-nowrap select-none">
      <Button
        type="button"
        className="flex h-full w-full items-center justify-center rounded-full p-0 bg-transparent hover:bg-slate-100 cursor-pointer"
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
              key="orb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ColorOrb dimension="36px" tones={{ base: "oklch(75% 0.15 350)" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </footer>
  )
}

const FORM_WIDTH = 380
const FORM_HEIGHT = 220

const InputForm = React.forwardRef(({ onSuccess }, ref) => {
  const { triggerClose, showForm } = useFormContext()
  const btnRef = React.useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    onSuccess()
  }

  function handleKeys(e) {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      btnRef.current?.click()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0 w-full"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col p-1 bg-white"
          >
            <div className="flex justify-between py-2 border-b border-slate-100 mb-2">
              <p className="text-slate-900 font-semibold z-2 ml-[48px] flex items-center gap-[6px] select-none">
                AI Assistant
              </p>
              <button
                type="submit"
                ref={btnRef}
                className="text-slate-500 right-4 mt-1 flex cursor-pointer items-center justify-center gap-1 rounded-[12px] bg-transparent pr-2 text-center select-none hover:text-slate-900"
              >
                <KeyHint>⌘</KeyHint>
                <KeyHint className="w-fit">Enter</KeyHint>
              </button>
            </div>
            <textarea
              ref={ref}
              placeholder="Ask me anything about MS Academy..."
              name="message"
              className="h-full w-full resize-none scroll-py-2 rounded-md p-4 outline-none text-slate-700 bg-slate-50 border border-slate-100 focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all"
              required
              onKeyDown={handleKeys}
              spellCheck={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-3 left-4"
          >
            <ColorOrb dimension="28px" tones={{ base: "oklch(75% 0.15 350)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
})

function KeyHint({ children, className }) {
  return (
    <kbd
      className={cx(
        "text-slate-500 flex h-6 w-fit items-center justify-center rounded-sm border border-slate-200 px-[6px] font-sans text-xs bg-slate-50",
        className
      )}
    >
      {children}
    </kbd>
  )
}

export default MorphPanel
