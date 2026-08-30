import Image from "next/image";

type AppLogoIconProps = {
  size?: number;
  className?: string;
};

/** Book mark from ui.png — used in nav shells and headers. */
export function AppLogoIcon({ size = 40, className = "" }: AppLogoIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-xl ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <Image
        src="/ui.png"
        alt="Learn Lab"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority
      />
    </span>
  );
}

type LoginLogoProps = {
  className?: string;
  width?: number;
};

/** Full learnlab wordmark from loginicon.png — login page only. */
export function LoginLogo({ className = "", width = 220 }: LoginLogoProps) {
  return (
    <Image
      src="/loginiconn.png"
      alt="Learn Lab"
      width={width}
      height={Math.round(width * (1254 / 1254))}
      className={`h-auto w-auto max-w-full object-contain ${className}`.trim()}
      priority
    />
  );
}

type AppBrandProps = {
  size?: number;
  showLabel?: boolean;
  labelClassName?: string;
};

export function AppBrand({
  size = 36,
  showLabel = true,
  labelClassName = "hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline",
}: AppBrandProps) {
  return (
    <span className="flex items-center gap-2">
      <AppLogoIcon size={size} />
      {showLabel ? <span className={labelClassName}>Learn Lab</span> : null}
    </span>
  );
}
