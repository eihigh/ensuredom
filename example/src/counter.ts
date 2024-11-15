import { ensure } from 'ensuredom';

export function Counter(parent: HTMLElement) {
  const root = ensure(parent, 'div') as (HTMLElement & { count: number });
  root.count ||= 0;
  const incr = () => { console.log('clicked'); root.count++; Counter(parent); }
  const btn = ensure(root, 'button');
  btn.textContent = `count is ${root.count}`;
  btn.onclick = incr;
}