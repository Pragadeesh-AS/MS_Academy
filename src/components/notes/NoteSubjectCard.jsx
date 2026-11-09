import React from 'react';
import { Bookmark, Lock, CheckCircle, Users, Tag, Trash2 } from 'lucide-react';
import { getSubjectAcronym, getSubjectSubtitle, getSubjectStreamCodes } from '../../utils/subjectAcronyms';

/**
 * Premium Note Subject Card matching the official MS Academy mobile & web design.
 * Features:
 *  - Rich emerald-to-forest green gradient
 *  - Dedicated centered stream header (e.g. "ME · XE · PI") with zero overlap
 *  - Embossed bronze/copper coin with white Bookmark icon
 *  - Prominent bold white acronym (e.g. "SOM", "TOM", "FM", "ET")
 *  - Centered thin white divider
 *  - Clean uppercase full subject title (e.g. "FLUID MECHANICS")
 *  - Harmonious files and topic count metadata
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

      {/* Top Header Row: Centered Stream Codes without collision */}
      <div className="relative w-full text-center px-8 pt-0.5 pb-1">
        <span className="text-[11.5px] sm:text-[12.5px] font-[800] tracking-[0.22em] uppercase text-white/90 truncate block drop-shadow-sm">
          {streamCodes}
        </span>
      </div>

      {/* Top Right Actions (Admin Trash or Student Access Status) */}
      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
        {status && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-[800] backdrop-blur-md border flex items-center gap-1 ${
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
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-black/25 active:scale-95 transition-all"
            title="Delete folder"
          >
            <Trash2 size={13} />
          </button>
        )}
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
      <div className="relative w-14 sm:w-16 h-[1.5px] bg-white/40 rounded-full mx-auto my-2" />

      {/* Subtitle: Full Subject Title */}
      <div
        className="relative text-[12.5px] sm:text-[13.5px] font-[900] tracking-wider uppercase text-white text-center leading-snug px-3 line-clamp-2 min-h-[34px] flex items-center justify-center drop-shadow-sm"
        title={subtitle}
      >
        {subtitle}
      </div>

      {/* File & Topic Count info cleanly integrated below subtitle */}
      {(fileCount !== undefined || topicCount > 0) && (
        <div className="relative mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-100/85">
          {fileCount !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-black/20 border border-white/10 backdrop-blur-sm">
              {fileCount} {fileCount === 1 ? 'file' : 'files'}
            </span>
          )}
          {topicCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/20 border border-white/10 backdrop-blur-sm">
              {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
            </span>
          )}
        </div>
      )}

      {/* Footer: Locked Buy Button */}
      {status === 'locked' && onBuy && (
        <div className="relative mt-4 pt-3 border-t border-white/15">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            disabled={isPaying}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white font-[900] text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-70"
          >
            {isPaying ? 'Processing…' : price ? `Buy Subject • ₹${price}` : 'Buy Subject'}
          </button>
        </div>
      )}

      {/* Admin Quick Controls */}
      {isAdmin && (
        <div className="relative mt-4 pt-3.5 border-t border-white/15 space-y-2.5">
          <div className="flex items-center justify-between text-[11.5px] font-bold text-white/80 px-1">
            <span className={price ? 'text-amber-200' : 'text-white/65'}>
              {price ? `₹${price}` : 'Not for sale'}
            </span>
            <span className="flex items-center gap-1 text-white/75">
              <Users size={12} /> {accessCount} with access
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {onAssign && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign(subject);
                }}
                className="w-full py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white text-[12px] font-bold backdrop-blur-md flex items-center justify-center gap-1.5 transition-all border border-white/10 shadow-sm"
              >
                <Users size={13} /> Assign
              </button>
            )}
            {onPrice && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrice(subject);
                }}
                className="w-full py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white text-[12px] font-bold backdrop-blur-md flex items-center justify-center gap-1.5 transition-all border border-white/10 shadow-sm"
              >
                <Tag size={13} /> Price
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
