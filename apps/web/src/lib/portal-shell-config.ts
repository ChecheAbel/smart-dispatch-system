import type { AuthMeResponse } from "@smart-dispatch/types";
import type { SupportedLocale } from "@/lib/locale";
import { resumeAdminSession, resumeUserSession } from "@/lib/auth-api";
import { isAdminNavActive } from "@/lib/admin-navigation";
import { isCustomerNavActive } from "@/lib/customer-navigation";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_PROFILE_PATH,
  ADMIN_SIGN_IN_PATH,
  USER_DASHBOARD_PATH,
  USER_HOME_PATH,
  USER_PROFILE_PATH,
  USER_SIGN_IN_PATH,
} from "@/lib/auth-paths";
import type { NavigationPortal } from "@/lib/portal-navigation";
import { getAdminShellMessages, getCustomerShellMessages } from "@/translations";

type ShellMessages = ReturnType<typeof getAdminShellMessages>;

export type PortalShellConfig = {
  portal: NavigationPortal;
  resumeSession: () => Promise<AuthMeResponse | null>;
  signInPath: string;
  homePath: string;
  logoHref: string;
  profilePath: string;
  isNavActive: (pathname: string, href: string) => boolean;
  getShellMessages: (locale: SupportedLocale) => ShellMessages;
  getHeaderEyebrow: (locale: SupportedLocale) => string;
  getProfileLabel: (locale: SupportedLocale) => string;
  getSignOutLabel: (locale: SupportedLocale) => string;
};

export const PORTAL_SHELL_CONFIG: Record<NavigationPortal, PortalShellConfig> = {
  admin: {
    portal: "admin",
    resumeSession: resumeAdminSession,
    signInPath: ADMIN_SIGN_IN_PATH,
    homePath: "/",
    logoHref: ADMIN_DASHBOARD_PATH,
    profilePath: ADMIN_PROFILE_PATH,
    isNavActive: isAdminNavActive,
    getShellMessages: getAdminShellMessages,
    getHeaderEyebrow: () => "Admin Console",
    getProfileLabel: () => "Profile",
    getSignOutLabel: () => "Sign out",
  },
  customer: {
    portal: "customer",
    resumeSession: resumeUserSession,
    signInPath: USER_SIGN_IN_PATH,
    homePath: USER_HOME_PATH,
    logoHref: USER_DASHBOARD_PATH,
    profilePath: USER_PROFILE_PATH,
    isNavActive: isCustomerNavActive,
    getShellMessages: getCustomerShellMessages,
    getHeaderEyebrow: (locale) => getCustomerShellMessages(locale).header.eyebrow,
    getProfileLabel: (locale) => getCustomerShellMessages(locale).header.profile,
    getSignOutLabel: (locale) => getCustomerShellMessages(locale).header.signOut,
  },
};
