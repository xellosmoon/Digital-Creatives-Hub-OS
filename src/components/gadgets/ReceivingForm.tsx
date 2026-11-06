import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import type { LateFeeUnit, ReturnCondition } from '../../types/gadgets';
import { RETURN_CONDITION_LABELS } from '../../types/gadgets';

// ============================================================
// Printable "Receiving Form" — one A4 page per physical unit,
// reproducing the Hub's paper form so a borrower can print it,
// sign it by hand, and bring it to the admin desk.
// ============================================================

export interface ReceivingFormData {
  borrowingReference?: string;
  borrowerName: string;
  borrowerOffice: string;
  borrowerContact: string;
  purpose: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  venue: string;
  deviceName: string;
  serialNumber: string | null;
  includedItems: string[];
  lateFeeRate: number | null;
  lateFeeUnit: LateFeeUnit | null;
  deviceOperatorName: string;
  // Return section — only present when viewing an existing borrowing from the admin side
  returnCondition?: ReturnCondition | null;
  returnRemarks?: string | null;
  receivedBy?: string | null;
  returnedAt?: string | null;
}

/** Shape common to every borrowing-row-with-joins call site (admin tables,
 *  My Borrows) — loose enough to accept whatever subset of item/asset
 *  columns that call site's Supabase select actually joined. */
export interface BorrowingLike {
  borrowing_reference: string;
  borrower_name?: string | null;
  borrower_office?: string | null;
  borrower_contact?: string | null;
  purpose?: string | null;
  start_time: string;
  end_time: string;
  destination_location?: string | null;
  asset?: { name?: string } | null;
  item?: { serial_number?: string | null; asset_tag?: string | null } | null;
  late_fee_rate?: number | null;
  late_fee_unit?: LateFeeUnit | null;
  device_operator_name?: string | null;
  return_condition?: ReturnCondition | null;
  return_remarks?: string | null;
  received_by?: string | null;
  actual_return_time?: string | null;
}

export function borrowingToFormData(b: BorrowingLike): ReceivingFormData {
  return {
    borrowingReference: b.borrowing_reference,
    borrowerName: b.borrower_name ?? '',
    borrowerOffice: b.borrower_office ?? '',
    borrowerContact: b.borrower_contact ?? '',
    purpose: b.purpose ?? '',
    startTime: b.start_time,
    endTime: b.end_time,
    venue: b.destination_location ?? '',
    deviceName: b.asset?.name ?? '',
    serialNumber: b.item?.serial_number ?? b.item?.asset_tag ?? null,
    includedItems: [],
    lateFeeRate: b.late_fee_rate ?? null,
    lateFeeUnit: b.late_fee_unit ?? null,
    deviceOperatorName: b.device_operator_name ?? b.borrower_name ?? '',
    returnCondition: b.return_condition ?? null,
    returnRemarks: b.return_remarks ?? null,
    receivedBy: b.received_by ?? null,
    returnedAt: b.actual_return_time ?? null,
  };
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'MMM d, yyyy · h:mm a');
  } catch {
    return '';
  }
}

// The checklist always has at least four rows, so there's room to
// hand-write extras at the desk.
const MIN_CHECKLIST_ROWS = 4;

/**
 * One A4 page for a single borrowed unit — laid out to fit the sheet by
 * construction. The page is a fixed-height flex column (see
 * SHARED_PAGE_STYLE), so it can never grow past one sheet and spill onto a
 * second; the return section is pinned to the bottom with the spare room
 * absorbed in the middle. The previous version used `min-height: 297mm`
 * with stacked single-column rows and ran ~32 mm over, which printed as two
 * sheets (the second mostly blank).
 */
export function ReceivingFormPage({ data, isLast }: { data: ReceivingFormData; isLast?: boolean }): JSX.Element {
  // The checklist widens (2 → 3 → 4 columns) as the item list grows, so a
  // unit with a long list of accessories still fits the sheet instead of
  // adding rows.
  const itemCount = data.includedItems.length;
  const checklistCols = itemCount <= 8 ? 2 : itemCount <= 12 ? 3 : itemCount <= 20 ? 4 : 5;
  const slotCount = Math.max(MIN_CHECKLIST_ROWS, Math.ceil(itemCount / checklistCols)) * checklistCols;
  const slots = Array.from({ length: slotCount }, (_, i) => data.includedItems[i] ?? '');

  return (
    <div
      className="receiving-form-page bg-white text-gray-900"
      style={{ pageBreakAfter: isLast ? 'auto' : 'always', breakAfter: isLast ? 'auto' : 'page' }}
    >
      {/* Header */}
      <header className="flex items-end justify-between border-b-[3px] border-gray-900 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Digital Creatives Hub Iligan</p>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight uppercase">Receiving Form</h1>
          <p className="text-[10px] text-gray-600">Equipment borrowing · Please print, sign, and submit at the Hub desk</p>
        </div>
        <div className="border-2 border-gray-900 px-3 py-1 text-right min-w-[34mm]">
          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-600">Reference No.</p>
          <p className="text-[16px] font-mono font-extrabold tracking-wider leading-tight">{data.borrowingReference || '—'}</p>
        </div>
      </header>

      {/* Borrower + schedule */}
      <Section title="Borrower & Schedule">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Name of Borrower" value={data.borrowerName} />
          <Field label="Office / Agency / Business" value={data.borrowerOffice} />
          <Field label="Contact Number" value={data.borrowerContact} />
          <Field label="Device Operator (if different)" value={data.deviceOperatorName === data.borrowerName ? '' : data.deviceOperatorName} />
          <Field label="Purpose of Borrowing" value={data.purpose} wide />
          <Field label="From (Date & Time)" value={fmt(data.startTime)} />
          <Field label="Until" value={fmt(data.endTime)} />
          <Field label="Venue" value={data.venue} wide />
        </div>
      </Section>

      {/* Device */}
      <Section title="Device">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Device Name" value={data.deviceName} />
          <Field label="Serial Number / Asset Tag" value={data.serialNumber ?? ''} />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mt-2.5 mb-1">
          Included items — check each item as it is handed over
        </p>
        <ul
          className="grid gap-x-6 gap-y-1.5"
          style={{ gridTemplateColumns: `repeat(${checklistCols}, minmax(0, 1fr))` }}
        >
          {slots.map((item, i) => (
            <li key={i} className="flex items-end gap-2">
              <span className="inline-block h-[11px] w-[11px] flex-shrink-0 border border-gray-700 mb-[3px]" />
              <span className="flex-1 border-b border-gray-400 text-[11.5px] leading-tight pb-[1px] min-h-[17px] break-words">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Undertaking */}
      <Section title="Undertaking">
        <p className="text-[10px] leading-[1.35] text-justify">
          I hereby acknowledge that I have received the above-mentioned device and its listed inclusions in
          good working condition. I commit to using the device responsibly and to take full care of it while
          in my possession. I fully understand and agree to the following conditions:
        </p>
        <ol className="text-[10px] leading-[1.35] text-justify list-decimal pl-5 mt-1 space-y-0.5">
          <li>
            I will be liable for any damage, loss, or theft of the device and its inclusions, and I agree to
            compensate the Digital Creatives Hub an amount equivalent to the current market value of the
            item(s) in such event.
          </li>
          <li>
            If I fail to return the device beyond the indicated date and time, I agree to pay a late charge of
            PHP&nbsp;
            <span className="inline-block border-b border-gray-600 min-w-[60px] text-center font-semibold">
              {data.lateFeeRate != null ? data.lateFeeRate.toFixed(2) : ''}
            </span>
            &nbsp;per {data.lateFeeUnit === 'day' ? 'day' : 'hour'} (as applicable) until the device is returned.
          </li>
          <li>
            Prolonged delays or failure to return the item without proper coordination may result in
            disciplinary and/or legal action.
          </li>
        </ol>
      </Section>

      {/* Signatures — name/signature on the left, when it was signed on the right */}
      <Section title="Signatures">
        <div className="grid grid-cols-[1fr_30mm_26mm] gap-x-4 gap-y-3">
          <SignatureLine label="Borrower's Name & Signature" prefill={data.borrowerName} />
          <SignatureLine label="Date Signed" />
          <SignatureLine label="Time Signed" />

          <SignatureLine label="Device Operator's Name & Signature" prefill={data.deviceOperatorName} className="col-span-3" />

          <SignatureLine label="Hub Representative's Name & Signature" />
          <SignatureLine label="Date Signed" />
          <SignatureLine label="Time Signed" />

          <SignatureLine label="Device / Gadget Received by (Complete Name and Signature)" className="col-span-3" />
        </div>
      </Section>

      {/* Return section — pinned to the bottom of the sheet */}
      <div className="mt-auto border-2 border-dashed border-gray-500 rounded-sm px-3 pt-2 pb-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wide mb-2">
          Device Return Section <span className="font-medium normal-case text-gray-600">— to be filled out upon return</span>
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Date & Time Returned" value={fmt(data.returnedAt)} />
          <Field label="Checked and Received By" value={data.receivedBy ?? ''} />
        </div>
        <div className="flex items-center gap-5 text-[10.5px] mt-2.5">
          <span className="font-semibold">Condition upon return:</span>
          {(['good', 'minor_issues', 'damaged_missing'] as ReturnCondition[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-[11px] w-[11px] border border-gray-700 text-center text-[10px] leading-[9px] font-bold">
                {data.returnCondition === c ? '✓' : ''}
              </span>
              {RETURN_CONDITION_LABELS[c]}
            </span>
          ))}
        </div>
        <div className="mt-2.5">
          <Field label="Remarks" value={data.returnRemarks ?? ''} wide />
          <div className="border-b border-gray-400 h-[18px]" />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="mt-3.5">
      <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] border-l-[3px] border-gray-900 pl-2 mb-2">{title}</h3>
      {children}
    </section>
  );
}

/** A labelled blank: small caption above, the filled-in value on a ruled
 *  line below. `wide` spans both columns of the parent grid. */
function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }): JSX.Element {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-gray-500 leading-none mb-[3px]">{label}</p>
      <p className="border-b border-gray-500 text-[12px] font-medium leading-tight pb-[2px] min-h-[19px] break-words">{value}</p>
    </div>
  );
}

function SignatureLine({ label, prefill, className = '' }: { label: string; prefill?: string; className?: string }): JSX.Element {
  return (
    <div className={className}>
      <div className="border-b border-gray-700 h-[30px] text-[11.5px] font-medium flex items-end pb-[2px]">{prefill ?? ''}</div>
      <p className="text-[8.5px] text-gray-500 mt-[3px] leading-none">{label}</p>
    </div>
  );
}

// A fixed height just under one sheet (296.5 mm of 297 mm): exactly 297 mm
// can tip into a second, blank page from sub-pixel rounding. overflow:hidden
// is the backstop — content is sized to fit with room to spare, but a form
// can never spill onto a second sheet.
const SHARED_PAGE_STYLE = `
  .receiving-form-page {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 210mm;
    height: 296.5mm;
    box-sizing: border-box;
    padding: 10mm 12mm;
    margin: 0 auto;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @media screen {
    .receiving-form-page {
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      margin-bottom: 16px;
    }
  }
`;

/**
 * Renders the form twice: an inline on-screen preview (wherever this
 * component is mounted, e.g. inside a small scaled review box), and a
 * print-only copy portaled directly onto <body>, sibling to the app's
 * #root mount. Printing hides #root outright (display:none — unlike
 * visibility:hidden, no descendant can override its way back to visible,
 * which is what silently broke an earlier version of this component: the
 * site footer's nav links kept rendering because a visibility-hidden
 * ancestor doesn't block a link that resolves to visibility:visible).
 * The portal — rather than reusing the inline preview node — also sidesteps
 * position:fixed getting trapped by a `transform`/`zoom` ancestor used to
 * shrink the on-screen preview.
 */
export default function ReceivingForm({ pages }: { pages: ReceivingFormData[] }): JSX.Element {
  const pageNodes = pages.map((data, i) => (
    <ReceivingFormPage key={i} data={data} isLast={i === pages.length - 1} />
  ));

  return (
    <>
      <div className="receiving-form-preview">
        <style>{SHARED_PAGE_STYLE}
          {`@media print { .receiving-form-preview { display: none !important; } }`}
        </style>
        {pageNodes}
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="receiving-form-print-root">
            <style>{SHARED_PAGE_STYLE}
              {`
                #receiving-form-print-root { display: none; }
                @media print {
                  @page { size: A4; margin: 0; }
                  #root { display: none !important; }
                  #receiving-form-print-root { display: block !important; }
                }
              `}
            </style>
            {pageNodes}
          </div>,
          document.body
        )}
    </>
  );
}
