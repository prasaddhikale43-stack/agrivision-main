import { cn } from "@/lib/utils";

export const AgriVisionLogo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    {...props}
  >
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    <path d="M5.5 12.5c-1.5 0-2.5-1-2.5-2.5s1-2.5 2.5-2.5 2.5 1 2.5 2.5" />
    <path d="M18.5 12.5c1.5 0 2.5-1 2.5-2.5s-1-2.5-2.5-2.5-2.5 1-2.5 2.5" />
    <path d="M12 22V12" />
  </svg>
);

export const AgriBotIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("w-6 h-6", className)}
        {...props}
    >
        <path d="M12 2a9 9 0 0 1 9 9v3.54a4 4 0 0 1-2.35 3.77l-2.06.98a3 3 0 0 1-3.18 0l-2.06-.98A4 4 0 0 1 3 14.54V11a9 9 0 0 1 9-9Zm0 3a6 6 0 0 0-6 6v3.54a1 1 0 0 0 .59.94l2.06.98a6 6 0 0 0 6.7 0l2.06-.98a1 1 0 0 0 .59-.94V11a6 6 0 0 0-6-6Zm-2.5 5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1Zm0 3h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1Z" />
    </svg>
  );
