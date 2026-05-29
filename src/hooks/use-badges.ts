import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  assignBadgeManual,
  deleteBadge,
  getUserBadges,
  getUsersByBadge,
  listAllBadges,
  revokeBadgeManual,
  upsertBadge,
} from "@/lib/badges.functions";

export function useAllBadges() {
  const fn = useServerFn(listAllBadges);
  return useQuery({
    queryKey: ["badges", "all"],
    queryFn: () => fn(),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useUserBadges(userId: string | null | undefined) {
  const fn = useServerFn(getUserBadges);
  return useQuery({
    queryKey: ["badges", "user", userId],
    queryFn: () => fn({ data: { userId: userId! } }),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useUsersByBadge(badgeId: string | null | undefined) {
  const fn = useServerFn(getUsersByBadge);
  return useQuery({
    queryKey: ["badges", "users", badgeId],
    queryFn: () => fn({ data: { badgeId: badgeId! } }),
    enabled: !!badgeId,
    staleTime: 30_000,
  });
}

export function useAssignBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(assignBadgeManual);
  return useMutation({
    mutationFn: (vars: { userId: string; badgeId: string }) => fn({ data: vars }),
    onSuccess: (_d, v) => {
      toast.success("Badge atribuído.");
      qc.invalidateQueries({ queryKey: ["badges", "users", v.badgeId] });
      qc.invalidateQueries({ queryKey: ["badges", "user", v.userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(revokeBadgeManual);
  return useMutation({
    mutationFn: (vars: { userId: string; badgeId: string }) => fn({ data: vars }),
    onSuccess: (_d, v) => {
      toast.success("Badge revogado.");
      qc.invalidateQueries({ queryKey: ["badges", "users", v.badgeId] });
      qc.invalidateQueries({ queryKey: ["badges", "user", v.userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export type BadgeValidityType = "forever" | "relative_years" | "fixed_date";

export interface BadgeInput {
  id?: string;
  title: string;
  description?: string | null;
  cluster_id: string;
  cover_url?: string | null;
  
  validity_type: BadgeValidityType;
  validity_years?: number | null;
  validity_fixed_date?: string | null;
}

export function useUpsertBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(upsertBadge);
  return useMutation({
    mutationFn: (vars: BadgeInput) => fn({ data: vars }),
    onSuccess: () => {
      toast.success("Badge guardado.");
      qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(deleteBadge);
  return useMutation({
    mutationFn: (vars: { id: string }) => fn({ data: vars }),
    onSuccess: () => {
      toast.success("Badge eliminado.");
      qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
