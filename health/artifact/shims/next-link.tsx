import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate } from "../router";

// next/link replacement: internal links navigate the in-memory router.
export default function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const internal = href.startsWith("/");
  return (
    <a
      {...rest}
      href={internal ? "#" + href : href}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (!internal || e.defaultPrevented) return;
        e.preventDefault();
        navigate(href);
      }}
    />
  );
}
