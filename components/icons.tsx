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

export const PhoneIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .4 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
  </IconBase>
);

export const MapPinIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </IconBase>
);

export const GlobeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </IconBase>
);

export const UploadIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M5 20h14" />
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

export const HomeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10M9 20v-6h6v6" />
  </IconBase>
);

export const MenuIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </IconBase>
);

export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </IconBase>
);

export const SearchIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </IconBase>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m15 18-6-6 6-6" />
  </IconBase>
);

export const ChevronRightIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m9 18 6-6-6-6" />
  </IconBase>
);

export const UserSettingsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2.5 21a6.5 6.5 0 0 1 11.2-4.5M17 15v6M14 18h6" />
  </IconBase>
);

export const BriefcaseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="7" width="18" height="13" rx="3" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
  </IconBase>
);

export const BoxIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 8 9 5 9-5v9l-9 5-9-5V8ZM12 13v9" />
  </IconBase>
);

export const ChartIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </IconBase>
);

export const SettingsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
  </IconBase>
);

export const FileSpreadsheetIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M8 13h8M8 17h8M11 10v10" />
  </IconBase>
);

export const FileTextIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M8 13h8M8 17h6" />
  </IconBase>
);

export const PrinterIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </IconBase>
);

export const ColumnsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16M15 4v16" />
  </IconBase>
);

export const CheckIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m5 12 4 4L19 6" />
  </IconBase>
);

export const EditIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </IconBase>
);

export const TrashIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
  </IconBase>
);

export const PlusIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
);

export const HistoryIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </IconBase>
);

export const ClockIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </IconBase>
);

export const ShieldIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 22c5-2 8-6 8-11V5c-3.5 0-6-.5-8-2-2 1.5-4.5 2-8 2v6c0 5 3 9 8 11Z" />
    <path d="m9 12 2 2 4-5" />
  </IconBase>
);
