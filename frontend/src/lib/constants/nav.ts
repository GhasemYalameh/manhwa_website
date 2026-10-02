export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "خانه" },
  { href: "/weekly", label: "پخش هفتگی" },
  { href: "/manhwa", label: "مانهواها" },
];