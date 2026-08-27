import Link from "next/link";

export const DASHBOARD_PREVIEW_COUNT = 3;

const viewMoreClass =
  "block w-full border-t border-slate-100 px-5 py-3 text-center text-sm font-medium text-violet-700 transition duration-150 hover:bg-slate-50 hover:text-violet-800";

export function ViewMoreFooter({
  href,
  onClick,
}: {
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link href={href} className={viewMoreClass}>
        View More
      </Link>
    );
  }
  return (
    <button type="button" className={viewMoreClass} onClick={onClick}>
      View More
    </button>
  );
}
