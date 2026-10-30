import type { ComponentProps } from "react";

// This site is a static export with no server, so Next's client router has nothing
// to fetch: its RSC payload URLs are not part of the export and 404 in the browser.
// Plain anchors give every navigation a normal, cacheable page load.
export default function Link({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a href={href} {...props} />;
}
