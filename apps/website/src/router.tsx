import { useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

const normalize = (pathname: string) => {
  const clean = pathname.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
};

export const usePath = () => {
  const [path, setPath] = useState(() => normalize(window.location.pathname));

  useEffect(() => {
    const update = () => setPath(normalize(window.location.pathname));
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  return path;
};

export function navigate(to: string) {
  const url = new URL(to, window.location.origin);
  const samePath = normalize(url.pathname) === normalize(window.location.pathname);

  if (samePath) {
    if (url.hash) document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/** An anchor that keeps in-site navigation in the client, new tabs and modifiers intact. */
export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!to.startsWith('/')) return;
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
