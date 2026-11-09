import React from 'react';
import { Bookmark, Lock, CheckCircle, Users, Tag, Trash2, ArrowRight } from 'lucide-react';
import { getSubjectAcronym, getSubjectSubtitle, getSubjectStreamCodes } from '../../utils/subjectAcronyms';

/**
 * Premium Note Subject Card matching the official MS Academy mobile & web design.
 * Features:
 *  - Rich emerald-to-forest green gradient
 *  - Centered stream tags (e.g. "ME · XE · PI")
 *  - Embossed bronze/copper coin with white Bookmark icon
 *  - Prominent bold white acronym (e.g. "SOM", "TOM", "FM", "ET")
 *  - Subtle white divider
 *  - Clean uppercase full subject title (e.g. "STRENGTH OF MATERIALS")
 *  - Full preservation of student lock/unlock state, buy button, and admin actions
 */
export default function NoteSubjectCard({
  subject,
  department = '',
  fileCount,
  topicCount,
  status = null, // 'owned' | 'included' | 'locked' | null
  price = null,
  onOpen,
  onBuy = null,
  isPaying = false,
  // Admin-specific props:
  isAdmin = false,
  accessCount = 0,
  onAssign = null,
  onPrice = null,
  onDelete = null,
}) {
  const name = subject?.name || '';
  const acronym = getSubjectAcronym(name);
  const subtitle = getSubjectSubtitle(name);
  const streamCodes = getSubjectStreamCodes(name, department || subject?.department);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="group relative w-full overflow-hidden cursor-pointer text-left rounded-[22px] border border-[#1ab164]/30 bg-gradient-to-b from-[#088c4b] via-[#046c37] to-[#015026] p-5 sm:p-6 shadow-[0_12px_28px_rgba(2,64,32,0.35)] hover:shadow-[0_20px_40px_rgba(2,64,32,0.48)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

      {/* Top Bar: Badges & Stream Codes */}
      <div className="relative w-full flex items-center justify-between gap-2 mb-2">
        {/* Left: Notes count / Topic count pill */}
        <div className="flex items-center gap-1.5">
          {fileCount !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-black/25 backdrop-blur-md border border-white/15 text-[10.5px] font-bold text-white/90">
              {fileCount} {fileCount === 1 ? 'file' : 'files'}
            </span>
          )}
          {topicCount > 0 && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-[10.5px] font-bold text-white/80">
              {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
            </span>
          )}
        </div>

        {/* Center: Top Stream Tags (ME · XE · PI) */}
        <div className="absolute left-1/2 -translate-x-1/2 text-[11px] sm:text-[12px] font-[800] tracking-[0.22em] uppercase text-white/85 text-center truncate max-w-[55%]">
          {streamCodes}
        </div>

        {/* Right: Status pill (Locked / Owned / Unlocked) or Admin Delete */}
        <div className="flex items-center gap-1">
          {status && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-[800] backdrop-blur-md border flex items-center gap-1 ${
                status === 'locked'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-300/30'
                  : 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30'
              }`}
            >
              {status === 'locked' ? <Lock size={10} /> : <CheckCircle size={10} />}
              {status === 'owned' ? 'Owned' : status === 'included' ? 'Unlocked' : 'Locked'}
            </span>
          )}

          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(subject);
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-red-500/80 transition-colors"
              title="Delete folder"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Content: Bronze Coin + Bold Acronym */}
      <div className="relative my-3 flex items-center justify-center gap-3.5 sm:gap-4">
        {/* Bronze/Copper Coin Badge */}
        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-b from-[#e58a36] via-[#cb6b1d] to-[#96420a] border-2 border-[#f7a552]/40 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-[-3deg] transition-all duration-300">
          <Bookmark size={20} className="text-white fill-white/20 drop-shadow-sm" strokeWidth={2.4} />
        </div>

        {/* Acronym Text */}
        <span className="text-3xl sm:text-[38px] font-[900] text-white tracking-tight leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]">
          {acronym}
        </span>
      </div>

      {/* Thin Divider Line */}
      <div className="relative w-14 sm:w-16 h-[1.5px] bg-white/40 rounded-full mx-auto my-1.5" />

      {/* Subtitle: Full Subject Title */}
      <div
        className="relative text-[12px] sm:text-[13px] font-[800] tracking-wider uppercase text-white text-center leading-snug px-3 line-clamp-2 min-h-[32px] flex items-center justify-center drop-shadow-sm"
        title={subtitle}
      >
        {subtitle}
      </div>

      {/* Footer: Locked Buy Button or Admin Controls */}
      {status === 'locked' && onBuy && (
        <div className="relative mt-3 pt-3 border-t border-white/15">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            disabled={isPaying}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-[900] text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-70"
          >
            {isPaying ? 'Processing…' : price ? `Buy Subject • ₹${price}` : 'Buy Subject'}
          </button>
        </div>
      )}

      {/* Admin Quick Controls */}
      {isAdmin && (
        <div className="relative mt-3 pt-3 border-t border-white/15 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-white/80">
            <span className={price ? 'text-amber-200' : 'text-white/60'}>
              {price ? `₹${price}` : 'Not for sale'}
            </span>
            <span className="flex items-center gap-1 text-white/70">
              <Users size={11} /> {accessCount} with access
            </span>
          </div>
          <div className="flex gap-1.5">
            {onAssign && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign(subject);
                }}
                className="flex-1 px-2 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold backdrop-blur-md flex items-center justify-center gap-1 transition-colors"
              >
                <Users size={11} /> Assign
              </button>
            )}
            {onPrice && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrice(subject);
                }}
                className="flex-1 px-2 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold backdrop-blur-md flex items-center justify-center gap-1 transition-colors"
              >
                <Tag size={11} /> Price
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
