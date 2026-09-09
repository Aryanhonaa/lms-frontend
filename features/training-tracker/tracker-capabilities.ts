import { useAuth } from "@/providers/auth-provider";

export type TrackerCapabilities = {
  canOperate: boolean;
  canTerminate: boolean;
  canViewAll: boolean;
};

export function trackerCapabilitiesFromRole(role: string | undefined | null): TrackerCapabilities {
  const canOperate = role === "TRAINER";
  const canTerminate = role === "ADMIN" || role === "SUPER_ADMIN";
  return {
    canOperate,
    canTerminate,
    canViewAll: canTerminate,
  };
}

export function useTrackerCapabilities(): TrackerCapabilities {
  const { user } = useAuth();
  return trackerCapabilitiesFromRole(user?.role);
}
