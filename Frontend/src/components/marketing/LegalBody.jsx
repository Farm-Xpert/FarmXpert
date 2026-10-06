// Shared by the legal pages and the sign-up pop-up.

/** A section body: paragraphs, with "• " lines grouped into a bullet list. */
export default function LegalBody({ body, className = '' }) {
  const parts = Array.isArray(body) ? body : [body];
  const blocks = [];
  for (const part of parts) {
    if (part.startsWith('• ')) {
      const last = blocks[blocks.length - 1];
      if (last?.list) last.items.push(part.slice(2)); else blocks.push({ list: true, items: [part.slice(2)] });
    } else blocks.push({ text: part });
  }
  return blocks.map((b, i) => (b.list
    ? <ul key={i} className={`legal-list ${className}`}>{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
    : <p key={i} className={className}>{b.text}</p>));
}
