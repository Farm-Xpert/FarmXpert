// Indian mobile numbers: the field shows a fixed "+91" and the farmer types
// only the 10 digits, grouped "98765 43210". The API stores "+919876543210".

/** Any stored or typed number -> the 10 local digits, grouped 5 + 5. */
export function toLocalPhone(value) {
  let d = String(value || '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

/** The grouped local number -> "+91XXXXXXXXXX", or '' when empty. */
export function toApiPhone(local) {
  const d = String(local || '').replace(/\D/g, '');
  return d ? `+91${d}` : '';
}

/** A valid Indian mobile: 10 digits starting 6-9. Empty is valid (the field is optional). */
export function isPhoneValid(local) {
  const d = String(local || '').replace(/\D/g, '');
  return !d || /^[6-9]\d{9}$/.test(d);
}
