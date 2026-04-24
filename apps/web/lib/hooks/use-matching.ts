"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MatchCandidateInfo {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  score: number;
}

export interface PendingMatchItem {
  listing_id: string;
  channel_type: string;
  external_id: string;
  external_url: string | null;
  current_match: MatchCandidateInfo;
  candidates: MatchCandidateInfo[];
}

export function usePendingMatches() {
  return useQuery({
    queryKey: ["matches", "pending"],
    queryFn: async () => {
      const res = await api.get<PendingMatchItem[]>("/products/match/pending");
      return res.data;
    },
  });
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, productId }: { listingId: string; productId: string }) =>
      api.post(`/products/match/${listingId}/confirm`, { product_id: productId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeclineMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) =>
      api.post(`/products/match/${listingId}/decline`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
