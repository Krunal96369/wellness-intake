/**
 * Client-side filtering and sorting for the submissions list. The list is small
 * (one user) and already fully loaded, so these are pure functions over the
 * fetched rows — no extra API round-trips or query params. Keeping the option
 * sets and the derivation here (rather than inline in the view) makes the rules
 * testable and the toolbar a thin, declarative shell.
 */
import type { SubmissionListItem } from '../types';

export type SortOrder = 'newest' | 'oldest';
export type DateRange = 'any' | '7d' | '30d' | '90d';
export type ProgressFilter = 'any' | 'draft' | 'completed';

export interface FilterState {
  sort: SortOrder;
  dateRange: DateRange;
  progress: ProgressFilter;
}

/** A single choice in a filter dropdown. The first option is the neutral default. */
export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export const SORT_OPTIONS: FilterOption<SortOrder>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export const DATE_OPTIONS: FilterOption<DateRange>[] = [
  { value: 'any', label: 'Any time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export const PROGRESS_OPTIONS: FilterOption<ProgressFilter>[] = [
  { value: 'any', label: 'Any progress' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
];

export const DEFAULT_FILTERS: FilterState = {
  sort: 'newest',
  dateRange: 'any',
  progress: 'any',
};

/** True when any filter differs from its default — drives the "Clear" affordance. */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.dateRange !== DEFAULT_FILTERS.dateRange ||
    filters.progress !== DEFAULT_FILTERS.progress
  );
}

const MS_PER_DAY = 86_400_000;
const DATE_RANGE_DAYS: Record<Exclude<DateRange, 'any'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * Derive the visible, ordered rows for a given filter state. Pure: the input
 * array is never mutated (sort runs on a copy).
 */
export function applyFilters(
  rows: SubmissionListItem[],
  filters: FilterState,
): SubmissionListItem[] {
  const { sort, dateRange, progress } = filters;
  let result = rows;

  if (progress !== 'any') {
    result = result.filter((r) => r.status === progress);
  }

  if (dateRange !== 'any') {
    const cutoff = Date.now() - DATE_RANGE_DAYS[dateRange] * MS_PER_DAY;
    result = result.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  }

  return [...result].sort((a, b) => {
    const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sort === 'newest' ? -delta : delta;
  });
}
