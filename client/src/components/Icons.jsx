/* Tiny stroke icon set — renders identically everywhere (no emoji font dependency). */
const S = ({ children, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
export const IconEdit = (p) => <S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>;
export const IconTrash = (p) => <S {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></S>;
export const IconPlay = (p) => <S {...p}><path d="M6 4l14 8-14 8Z" fill="currentColor" stroke="none" /></S>;
export const IconPause = (p) => <S {...p}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></S>;
export const IconStar = (p) => <S {...p}><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9Z" /></S>;
export const IconLeft = (p) => <S {...p}><path d="M15 6l-6 6 6 6" /></S>;
export const IconRight = (p) => <S {...p}><path d="M9 6l6 6-6 6" /></S>;
export const IconCamera = (p) => <S {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.4" /></S>;
export const IconPlus = (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IconSun = (p) => <S {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" /></S>;
export const IconMoon = (p) => <S {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></S>;
