import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MailIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m5 8 7 5 7-5" />
  </IconBase>
);

export const LockIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="4" y="10" width="16" height="11" rx="3" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </IconBase>
);

export const EyeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </IconBase>
);

export const EyeOffIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2 2.7M6.4 6.4C3.9 8.2 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3-.5" />
  </IconBase>
);

export const SunIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </IconBase>
);

export const MoonIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
  </IconBase>
);

export const ArrowIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 12h14M14 7l5 5-5 5" />
  </IconBase>
);

export const UsersIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </IconBase>
);

export const TreatmentIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 22c5-2 8-6 8-11V5c-3.5 0-6-.5-8-2-2 1.5-4.5 2-8 2v6c0 5 3 9 8 11Z" />
    <path d="M8.5 12h7M12 8.5v7" />
  </IconBase>
);

export const CalendarIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </IconBase>
);

export const LogoutIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
  </IconBase>
);
