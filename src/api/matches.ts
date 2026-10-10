import { apiClient } from './client';
import type { HistoryParams, MatchRecord, Page, RankingEntry, RankingParams } from './contracts';

function assertPage<T>(data: unknown): Page<T> {
  const d = data as Partial<Page<T>> | null;
  if (!d || typeof d !== 'object' || !Array.isArray(d.items) || typeof d.total !== 'number') {
    throw new Error('Unexpected response from the server');
  }
  return d as Page<T>;
}

export async function fetchRanking(params: RankingParams, signal?: AbortSignal): Promise<Page<RankingEntry>> {
  const { data } = await apiClient.get<Page<RankingEntry>>('/ranking', { params, signal });
  return assertPage<RankingEntry>(data);
}

export async function fetchHistory(params: HistoryParams, signal?: AbortSignal): Promise<Page<MatchRecord>> {
  const { data } = await apiClient.get<Page<MatchRecord>>('/history', { params, signal });
  return assertPage<MatchRecord>(data);
}

export async function submitMatch(record: MatchRecord): Promise<MatchRecord> {
  const { data } = await apiClient.put<MatchRecord>(`/matches/${record.id}`, record);
  if (!data || typeof data !== 'object' || typeof (data as MatchRecord).id !== 'string') throw new Error('Unexpected response from the server');
  return data;
}
