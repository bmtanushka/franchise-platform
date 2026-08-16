import { LayoutDashboard, ListChecks, Building2, Briefcase, UserCircle, Users, GraduationCap } from "lucide-react";
import type { Role } from "@/lib/db/context";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const ALL_ROLES: Role[] = ["super_admin", "franchisor", "franchisee", "service_provider"];

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { label: "Leads", href: "/dashboard/leads", icon: ListChecks, roles: ALL_ROLES },
  { label: "Franchisees", href: "/dashboard/franchisees", icon: Building2, roles: ["super_admin", "franchisor"] },
  { label: "Providers", href: "/dashboard/providers", icon: Briefcase, roles: ["super_admin", "franchisor"] },
  { label: "Users", href: "/dashboard/users", icon: Users, roles: ["super_admin"] },
  {
    label: "Courses",
    href: "/dashboard/courses",
    icon: GraduationCap,
    roles: ["super_admin", "franchisor", "franchisee"],
  },
  { label: "My Profile", href: "/dashboard/profile", icon: UserCircle, roles: ALL_ROLES },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
