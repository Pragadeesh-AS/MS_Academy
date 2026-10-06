import React from 'react';
import logoImg from '../../assets/msgate_logo.png';
import {
  GENDERS, CURRENT_YEARS, GATE_PAPERS, REFERRAL_SOURCES, RULES, DECLARATION, gateYearOptions, formatFormDate
} from '../../utils/admissionForm';

// The two pages of the MS GATE Academy Admission Application Form, laid out like the paper form.
// Editable (the student fills it in) or read-only (the admin view and the PDF). `print` lays the
// page out at the fixed A4 width (794px) whatever the screen size; otherwise it adapts to phones.
// The photo box and the signature are passed in as slots so the student page can make them
// uploadable / pasteable and the admin page can show the saved images.

const NAVY = '#1f3a68';
const BORDER = 'border-[#7f8ea8]';

const Page = ({ print, pageRef, children }) => (
  <div
    ref={pageRef}
    className={print
      ? 'bg-white text-[#1a1a1a]'
      : 'bg-white text-[#1a1a1a] w-full max-w-[860px] mx-auto rounded-2xl shadow-[0_10px_40px_rgba(15,23,42,0.10)] border border-slate-200 px-4 py-6 sm:px-10 sm:py-10'}
    style={print ? { width: 794, minHeight: 1123, padding: '56px 52px', fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' } : { fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' }}
  >
    {children}
  </div>
);

const SectionBar = ({ children }) => (
  <div className="text-white text-[12.5px] font-bold tracking-wide px-2 py-[3px] uppercase mt-6 mb-2" style={{ background: NAVY }}>
    {children}
  </div>
);

const inputCls = 'w-full bg-transparent px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:bg-blue-50/70 placeholder:text-slate-300 transition-colors';

// One answer cell: a text box / select / textarea when editing, the saved text when read-only
const Answer = ({ field, form, set, readOnly, type = 'text', options, placeholder, rows, inputMode, maxLength, format }) => {
  const value = form[field] ?? '';
  if (readOnly) {
    return <div className="px-3 py-2.5 text-[14px] font-semibold text-slate-900 whitespace-pre-wrap break-words min-h-[40px]">{format ? format(value) : value}</div>;
  }
  if (options) {
    return (
      <select value={value} onChange={e => set(field, e.target.value)} className={`${inputCls} cursor-pointer ${value ? '' : 'text-slate-400'}`}>
        <option value="">{placeholder || 'Select…'}</option>
        {options.map(o => <option key={o} value={o} className="text-slate-900">{o}</option>)}
      </select>
    );
  }
  if (rows) {
    return <textarea rows={rows} value={value} onChange={e => set(field, e.target.value)} placeholder={placeholder} className={`${inputCls} resize-none block`} />;
  }
  return (
    <input
      type={type}
      value={value}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      className={inputCls}
    />
  );
};

const ErrorText = ({ msg }) => (msg ? <div className="px-3 pb-1.5 -mt-1 text-[11.5px] font-semibold text-red-600">{msg}</div> : null);

// Section A row: label | answer
const Row = ({ label, field, errors, print, children }) => (
  <div data-field={field} className={`grid ${print ? 'grid-cols-[200px_1fr]' : 'grid-cols-1 sm:grid-cols-[200px_1fr]'} border-b ${BORDER}`}>
    <div className={`bg-[#f2f2f2] px-3 py-2.5 text-[13.5px] font-semibold text-slate-800 flex items-center ${print ? `border-r ${BORDER}` : `sm:border-r ${BORDER}`}`}>{label}</div>
    <div className={`border-r ${BORDER} ${errors?.[field] ? 'bg-red-50' : ''}`}>
      {children}
      <ErrorText msg={errors?.[field]} />
    </div>
  </div>
);

// Section B cell pair: label | answer, two pairs side by side on a wide page
const Pair = ({ label, field, errors, print, children }) => (
  <div data-field={field} className={`grid ${print ? 'grid-cols-[132px_1fr]' : 'grid-cols-[120px_1fr] sm:grid-cols-[132px_1fr]'} border-b ${BORDER}`}>
    <div className={`bg-[#f2f2f2] px-3 py-2.5 text-[13.5px] font-semibold text-slate-800 leading-tight flex items-center border-r ${BORDER}`}>{label}</div>
    <div className={`border-r ${BORDER} min-w-0 ${errors?.[field] ? 'bg-red-50' : ''}`}>
      {children}
      <ErrorText msg={errors?.[field]} />
    </div>
  </div>
);

const Blank = ({ children, width }) => (
  <span className="inline-block border-b border-slate-700 px-1 font-semibold text-slate-900 align-bottom" style={{ minWidth: width }}>{children || ' '}</span>
);

export function AdmissionPageOne({ form, set, errors = {}, readOnly = false, print = false, formNo, applicationDate, photoSlot, pageRef }) {
  const gateYears = gateYearOptions();
  const toggleReferral = (src) => {
    const has = form.referralSources.includes(src);
    set('referralSources', has ? form.referralSources.filter(s => s !== src) : [...form.referralSources, src]);
  };

  return (
    <Page print={print} pageRef={pageRef}>
      {/* Header: title and the passport photo box */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 pt-2">
          <img src={logoImg} alt="" className={`${print ? 'w-14 h-14' : 'w-11 h-11 sm:w-14 sm:h-14'} object-contain shrink-0`} />
          <div className="min-w-0">
            <div className={`${print ? 'text-[26px]' : 'text-[20px] sm:text-[26px]'} font-bold leading-tight`} style={{ color: NAVY }}>MS GATE ACADEMY</div>
            <div className={`${print ? 'text-[16px]' : 'text-[14px] sm:text-[16px]'} font-bold text-slate-900 mt-0.5`}>Admission Application Form</div>
          </div>
        </div>
        <div data-field="photo" className="shrink-0 flex flex-col items-end">
          {photoSlot}
          {errors.photo && <div className="text-[11.5px] font-semibold text-red-600 mt-1 text-right max-w-[130px]">{errors.photo}</div>}
        </div>
      </div>

      {/* Form No / Application Date / UG Batch */}
      <div className={`mt-5 flex flex-wrap items-end ${print ? 'gap-x-8' : 'gap-x-6 sm:gap-x-8'} gap-y-3 text-[13.5px] text-slate-800`}>
        <div>Form No: <Blank width={110}>{formNo || (readOnly ? '' : <span className="text-slate-400 font-medium">on submit</span>)}</Blank></div>
        <div>Application Date: <Blank width={100}>{formatFormDate(applicationDate)}</Blank></div>
        <div data-field="ugBatch" className="flex items-end gap-1">
          <span>UG Batch:</span>
          {readOnly ? <Blank width={110}>{form.ugBatch}</Blank> : (
            <input
              value={form.ugBatch}
              onChange={e => set('ugBatch', e.target.value)}
              placeholder="Eg 2022-2026"
              maxLength={11}
              className={`w-[120px] border-b ${errors.ugBatch ? 'border-red-500 bg-red-50' : 'border-slate-700'} px-1 py-0.5 font-semibold text-slate-900 outline-none focus:bg-blue-50/70 placeholder:text-slate-300 placeholder:font-medium`}
            />
          )}
        </div>
      </div>
      {errors.ugBatch && <div className="text-[11.5px] font-semibold text-red-600 mt-1">{errors.ugBatch}</div>}

      {/* Section A */}
      <SectionBar>Section A: Student Details</SectionBar>
      <div className={`border-l border-t ${BORDER}`}>
        <Row label="Full name (as per ID)" field="fullName" errors={errors} print={print}>
          <Answer field="fullName" form={form} set={set} readOnly={readOnly} placeholder="As printed on your ID card" />
        </Row>
        <Row label="Date of birth" field="dob" errors={errors} print={print}>
          <Answer field="dob" form={form} set={set} readOnly={readOnly} type="date" format={formatFormDate} />
        </Row>
        <Row label="Gender" field="gender" errors={errors} print={print}>
          <Answer field="gender" form={form} set={set} readOnly={readOnly} options={GENDERS} placeholder="Select gender…" />
        </Row>
        <Row label="Mobile number" field="mobile" errors={errors} print={print}>
          <Answer field="mobile" form={form} set={set} readOnly={readOnly} type="tel" inputMode="numeric" maxLength={14} placeholder="10-digit mobile number" />
        </Row>
        <Row label="WhatsApp number" field="whatsapp" errors={errors} print={print}>
          {!readOnly && form.mobile && form.whatsapp !== form.mobile ? (
            <div className="flex items-center">
              <div className="flex-1"><Answer field="whatsapp" form={form} set={set} type="tel" inputMode="numeric" maxLength={14} placeholder="10-digit WhatsApp number" /></div>
              <button type="button" onClick={() => set('whatsapp', form.mobile)} className="shrink-0 mr-2 text-[11.5px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">
                Same as mobile
              </button>
            </div>
          ) : (
            <Answer field="whatsapp" form={form} set={set} readOnly={readOnly} type="tel" inputMode="numeric" maxLength={14} placeholder="10-digit WhatsApp number" />
          )}
        </Row>
        <Row label="Email ID" field="email" errors={errors} print={print}>
          <Answer field="email" form={form} set={set} readOnly={readOnly} type="email" placeholder="you@example.com" />
        </Row>
        <Row label="Permanent address" field="address" errors={errors} print={print}>
          <Answer field="address" form={form} set={set} readOnly={readOnly} rows={2} placeholder="Door no, street, city, district, PIN code" />
        </Row>
      </div>

      {/* Section B */}
      <SectionBar>Section B: Educational Qualification</SectionBar>
      <div className={`grid ${print ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} border-l border-t ${BORDER}`}>
        <Pair label="Degree / Branch" field="degreeBranch" errors={errors} print={print}>
          <Answer field="degreeBranch" form={form} set={set} readOnly={readOnly} placeholder="e.g. B.E. ECE" />
        </Pair>
        <Pair label="College" field="college" errors={errors} print={print}>
          <Answer field="college" form={form} set={set} readOnly={readOnly} placeholder="College name" />
        </Pair>
        <div data-field={errors.currentYear ? 'currentYear' : 'passingYear'} className={`grid ${print ? 'grid-cols-[132px_1fr]' : 'grid-cols-[120px_1fr] sm:grid-cols-[132px_1fr]'} border-b ${BORDER}`}>
          <div className={`bg-[#f2f2f2] px-3 py-2.5 text-[13.5px] font-semibold text-slate-800 leading-tight flex items-center border-r ${BORDER}`}>Year of passing / current year</div>
          <div className={`border-r ${BORDER} min-w-0 ${errors.currentYear || errors.passingYear ? 'bg-red-50' : ''}`}>
            {readOnly ? (
              <div className="px-3 py-2.5 text-[14px] font-semibold text-slate-900">{[form.passingYear, form.currentYear].filter(Boolean).join(' / ')}</div>
            ) : (
              <div className="grid grid-cols-[1fr_1.2fr] h-full">
                <input
                  value={form.passingYear}
                  onChange={e => set('passingYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder="Pass year"
                  className={`${inputCls} border-r border-dashed border-slate-300 min-w-0`}
                />
                <select value={form.currentYear} onChange={e => set('currentYear', e.target.value)} className={`${inputCls} cursor-pointer min-w-0 ${form.currentYear ? '' : 'text-slate-400'}`}>
                  <option value="">Year…</option>
                  {CURRENT_YEARS.map(o => <option key={o} value={o} className="text-slate-900">{o}</option>)}
                </select>
              </div>
            )}
            <ErrorText msg={errors.passingYear || errors.currentYear} />
          </div>
        </div>
        <Pair label="CGPA / Percentage" field="cgpa" errors={errors} print={print}>
          <Answer field="cgpa" form={form} set={set} readOnly={readOnly} placeholder="e.g. 8.2 CGPA or 78%" maxLength={20} />
        </Pair>
        <Pair label="GATE paper / branch" field="gatePaper" errors={errors} print={print}>
          <Answer field="gatePaper" form={form} set={set} readOnly={readOnly} options={GATE_PAPERS} placeholder="Select paper…" />
        </Pair>
        <Pair label="GATE year appearing" field="gateYear" errors={errors} print={print}>
          <Answer field="gateYear" form={form} set={set} readOnly={readOnly} options={gateYears.includes(form.gateYear) || !form.gateYear ? gateYears : [form.gateYear, ...gateYears]} placeholder="Select year…" />
        </Pair>
      </div>

      {/* Section C */}
      <SectionBar>Section C: How did you hear about us?</SectionBar>
      <div data-field="referralSources" className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-slate-800 ${errors.referralSources ? 'bg-red-50 rounded-lg p-2' : 'py-1'}`}>
        {REFERRAL_SOURCES.map(src => {
          const checked = form.referralSources.includes(src);
          return readOnly ? (
            <span key={src} className="inline-flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-[14px] h-[14px] border border-slate-700 text-[11px] leading-none font-bold ${checked ? 'text-slate-900' : 'text-transparent'}`}>✓</span>
              {src}
            </span>
          ) : (
            <label key={src} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={checked} onChange={() => toggleReferral(src)} className="w-[15px] h-[15px] accent-[#1f3a68] cursor-pointer" />
              {src}
            </label>
          );
        })}
        {form.referralSources.includes('Other') && (readOnly ? (
          <span className="font-semibold">({form.referralOther})</span>
        ) : (
          <input
            value={form.referralOther}
            onChange={e => set('referralOther', e.target.value)}
            placeholder="Where did you hear about us?"
            maxLength={80}
            className="flex-1 min-w-[180px] border-b border-slate-700 px-1 py-0.5 text-[13.5px] font-semibold outline-none focus:bg-blue-50/70 placeholder:text-slate-300 placeholder:font-medium"
          />
        ))}
      </div>
      {errors.referralSources && <div className="text-[11.5px] font-semibold text-red-600 mt-1">{errors.referralSources}</div>}
    </Page>
  );
}

export function AdmissionPageTwo({ form, set, errors = {}, readOnly = false, print = false, signedDate, signatureSlot, signatureTools, pageRef }) {
  return (
    <Page print={print} pageRef={pageRef}>
      <div className="text-center">
        <div className={`${print ? 'text-[24px]' : 'text-[20px] sm:text-[24px]'} font-bold`} style={{ color: NAVY }}>MS GATE ACADEMY</div>
        <div className="text-[15px] font-bold text-slate-900 mt-1">RULES AND REGULATIONS</div>
      </div>

      <div className="mt-5 space-y-3">
        {RULES.map((rule, i) => (
          <div key={rule.title}>
            <div className="text-[14px] font-bold" style={{ color: NAVY }}>{i + 1}. {rule.title}</div>
            {rule.items.map((item, j) => (
              <div key={j} className="grid grid-cols-[34px_1fr] text-[13.5px] text-slate-800 leading-snug mt-1">
                <span>{i + 1}.{j + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-500 mt-7 pt-4">
        <div className="text-[17px] font-bold text-slate-900">DECLARATION</div>
        <p className="text-[13.5px] text-slate-800 leading-snug mt-1">{DECLARATION}</p>

        {!readOnly && (
          <label data-field="declarationAccepted" className={`mt-3 flex items-start gap-2.5 cursor-pointer select-none rounded-xl border px-3 py-2.5 transition-colors ${errors.declarationAccepted ? 'border-red-300 bg-red-50' : form.declarationAccepted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
            <input type="checkbox" checked={form.declarationAccepted} onChange={e => set('declarationAccepted', e.target.checked)} className="w-[16px] h-[16px] mt-0.5 accent-[#1f3a68] cursor-pointer shrink-0" />
            <span className="text-[13.5px] font-semibold text-slate-800">I have read the Rules and Regulations above and I agree to this declaration.</span>
          </label>
        )}

        <div className={`mt-6 flex flex-wrap items-end gap-x-10 gap-y-4 text-[13.5px] text-slate-800`}>
          <div data-field="signature" className="flex items-end gap-2 min-w-0">
            <span className="shrink-0 pb-0.5">Student signature:</span>
            <div className="relative border-b border-slate-700 w-[230px] sm:w-[240px] h-[64px] flex items-end justify-center">
              {signatureSlot}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="pb-0.5">Date:</span>
            <Blank width={100}>{formatFormDate(signedDate)}</Blank>
          </div>
        </div>
        {errors.signature && <div className="text-[11.5px] font-semibold text-red-600 mt-1.5">{errors.signature}</div>}
        {!readOnly && signatureTools}
      </div>
    </Page>
  );
}
