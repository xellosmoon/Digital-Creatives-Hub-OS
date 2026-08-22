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
    return format(new Date(iso), 'MMM d, yyyy h:mm a');
  } catch {
    return '';
  }
}

/** One A4-sized printable page for a single borrowed unit. */
export function ReceivingFormPage({ data, isLast }: { data: ReceivingFormData; isLast?: boolean }): JSX.Element {
  const blanks = Array.from({ length: Math.max(5, data.includedItems.length) });

  return (
    <div
      className="receiving-form-page bg-white text-gray-900"
      style={{ pageBreakAfter: isLast ? 'auto' : 'always' }}
    >
      <div className="text-center mb-4">
        <h1 className="text-base font-bold tracking-wide uppercase">Digital Creatives Hub Iligan</h1>
        <h2 className="text-sm font-semibold tracking-wide uppercase mt-0.5">Receiving Form</h2>
        {data.borrowingReference && (
          <p className="text-[10px] text-gray-500 mt-1 font-mono">{data.borrowingReference}</p>
        )}
      </div>

      <FormRow label="Name of Borrower" value={data.borrowerName} />
      <FormRow label="Office/Agency/Business" value={data.borrowerOffice} />
      <FormRow label="Contact Number" value={data.borrowerContact} />
      <FormRow label="Purpose of Borrowing" value={data.purpose} />
      <div className="flex gap-6">
        <FormRow label="From (Date and Time)" value={fmt(data.startTime)} className="flex-1" />
        <FormRow label="Until" value={fmt(data.endTime)} className="flex-1" />
      </div>
      <FormRow label="Venue" value={data.venue} />

      <p className="text-xs font-bold uppercase mt-4 mb-1">Device Description</p>
      <FormRow label="Device Name" value={data.deviceName} />
      <FormRow label="Serial Number" value={data.serialNumber ?? ''} />

      <p className="text-xs font-bold uppercase mt-4 mb-1">List of Included Items</p>
      <ul className="space-y-1 mb-3">
        {blanks.map((_, i) => (
          <li key={i} className="text-xs border-b border-gray-400 pb-0.5 min-h-[16px]">
            {data.includedItems[i] ?? ''}
          </li>
        ))}
      </ul>

      <p className="text-xs font-bold uppercase mt-4 mb-1">Undertaking</p>
      <p className="text-[11px] leading-snug text-justify">
        I hereby acknowledge that I have received the above-mentioned device and its listed inclusions in
        good working condition. I commit to using the device responsibly and to take full care of it while
        in my possession. I fully understand and agree to the following conditions:
      </p>
      <ol className="text-[11px] leading-snug list-decimal pl-5 mt-1 space-y-1">
        <li>
          I will be liable for any damage, loss, or theft of the device and its inclusions, and I agree to
          compensate the Digital Creatives Hub an amount equivalent to the current market value of the
          item(s) in such event.
        </li>
        <li>
          If I fail to return the device beyond the indicated date and time, I agree to pay a late charge of
          PHP&nbsp;
          <span className="inline-block border-b border-gray-500 min-w-[70px] text-center font-medium">
            {data.lateFeeRate != null ? data.lateFeeRate.toFixed(2) : ''}
          </span>
          &nbsp;per {data.lateFeeUnit === 'day' ? 'day' : 'hour'} (as applicable) until the device is returned.
        </li>
        <li>
          Prolonged delays or failure to return the item without proper coordination may result in
          disciplinary and/or legal action.
        </li>
      </ol>

      <div className="mt-6 space-y-4">
        <SignatureLine label="Borrower's Name & Signature" prefill={data.borrowerName} />
        <SignatureLine label="Device Operator's Name & Signature" prefill={data.deviceOperatorName} />
        <div className="flex gap-6">
          <SignatureLine label="Date Signed" className="flex-1" />
          <SignatureLine label="Time Signed" className="flex-1" />
        </div>
        <SignatureLine label="Hub Representative's Name & Signature" />
        <div className="flex gap-6">
          <SignatureLine label="Date Signed" className="flex-1" />
          <SignatureLine label="Time Signed" className="flex-1" />
        </div>
        <SignatureLine label="Device/Gadget Received by (Complete Name and Signature)" />
      </div>

      <div className="border-t-2 border-dashed border-gray-400 mt-6 pt-3">
        <p className="text-xs font-bold uppercase mb-2">Device Return Section (to be filled out upon return)</p>
        <FormRow label="Date & Time Returned" value={fmt(data.returnedAt)} />
        <p className="text-[11px] mt-2 mb-1">Condition Upon Return:</p>
        <div className="flex gap-6 text-[11px] mb-2">
          {(['good', 'minor_issues', 'damaged_missing'] as ReturnCondition[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 border border-gray-600 text-center leading-[10px]">
                {data.returnCondition === c ? '✓' : ''}
              </span>
              {RETURN_CONDITION_LABELS[c]}
            </span>
          ))}
        </div>
        <FormRow label="Remarks" value={data.returnRemarks ?? ''} />
        <FormRow label="Checked and Received By" value={data.receivedBy ?? ''} />
      </div>
    </div>
  );
}

function FormRow({ label, value, className = '' }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className={`flex items-baseline gap-2 mb-2 ${className}`}>
      <span className="text-[11px] font-medium whitespace-nowrap">{label}:</span>
      <span className="flex-1 border-b border-gray-400 text-[11px] pb-0.5 min-h-[14px]">{value}</span>
    </div>
  );
}

function SignatureLine({ label, prefill, className = '' }: { label: string; prefill?: string; className?: string }): JSX.Element {
  return (
    <div className={className}>
      <div className="border-b border-gray-600 h-6 text-[11px] flex items-end pb-0.5">{prefill ?? ''}</div>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

const SHARED_PAGE_STYLE = `
  .receiving-form-page {
    width: 210mm;
    min-height: 297mm;
    box-sizing: border-box;
    padding: 12mm;
    margin: 0 auto;
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
