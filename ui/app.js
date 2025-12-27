/** @typedef {import('pear-interface')} */ /* global Pear */

function line(label, ok, detail = '') {
  const mark = ok ? 'OK ' : 'NO ';
  return `${mark}${label}${detail ? ` — ${detail}` : ''}`;
}

function setStatus(text, ok) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = ok ? 'ok' : 'bad';
}

function main() {
  // DOM check
  const domOk = typeof document !== 'undefined' && typeof window !== 'undefined';

  // Pear global check (provided by Pear runtime)
  const pearOk = typeof Pear !== 'undefined';

  // Basic runtime details (safe)
  const details = [];
  details.push(line('DOM available', domOk));
  details.push(line('Pear global available', pearOk));

  if (pearOk) {
    // These properties may or may not exist depending on runtime/build; probe safely.
    const keys = Object.keys(Pear || {}).slice(0, 20);
    details.push(line('Pear keys (sample)', true, keys.join(', ')));
  }

  const ok = domOk && pearOk;
  setStatus(details.join('\n'), ok);
}

main();
