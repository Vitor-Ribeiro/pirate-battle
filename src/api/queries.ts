import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { HistoryParams, MatchRecord, RankingParams } from './contracts';
import { fetchHistory, fetchRanking, submitMatch } from './matches';
import { remove } from './pendingMatches';

export const queryKeys = {
  ranking: (p: RankingParams) => ['ranking', p] as const,
  history: (p: HistoryParams) => ['history', p] as const,
};

// A response only fills the cache entry of ITS OWN key (page, config, player), and a request that is no longer
// used is aborted through `signal`. A late answer for an old page can therefore never replace newer data.
export function useRankingQuery(params: RankingParams) {
  return useQuery({
    queryKey: queryKeys.ranking(params),
    queryFn: ({ signal }) => fetchRanking(params, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always', // refreshed every time the tab is shown again
  });
}

export function useHistoryQuery(params: HistoryParams) {
  return useQuery({
    queryKey: queryKeys.history(params),
    queryFn: ({ signal }) => fetchHistory(params, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function invalidateLists(client: QueryClient): Promise<unknown> {
  return Promise.all([client.invalidateQueries({ queryKey: ['ranking'] }), client.invalidateQueries({ queryKey: ['history'] })]);
}

/** PUT is idempotent by match id: retries and repeated clicks return the existing record. */
export function useSubmitMatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (record: MatchRecord) => submitMatch(record),
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    onSuccess: async (saved) => {
      remove(saved.id);
      await invalidateLists(client);
    },
  });
}
