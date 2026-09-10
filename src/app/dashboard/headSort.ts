/*
 * How the Budget Head cards on the Fixed Expenses page are ordered.
 * The choice is saved per user in profiles.head_sort and re-applied on
 * every visit; the ordering itself is computed server-side from live
 * data, so it updates as bills get paid, amounts change, etc.
 */
export const HEAD_SORT_MODES = [
  "custom",
  "due",
  "alloc-desc",
  "alloc-asc",
  "name",
] as const;

export type HeadSortMode =
  (typeof HEAD_SORT_MODES)[number];

export const HEAD_SORT_LABELS: Record<
  HeadSortMode,
  string
> = {
  custom: "Custom order",
  due: "By due date",
  "alloc-desc": "Allocation: high to low",
  "alloc-asc": "Allocation: low to high",
  name: "Name: A–Z",
};

export const HEAD_SORT_SHORT: Record<
  HeadSortMode,
  string
> = {
  custom: "Custom",
  due: "Due date",
  "alloc-desc": "High → low",
  "alloc-asc": "Low → high",
  name: "A–Z",
};

export function isHeadSortMode(
  value: unknown
): value is HeadSortMode {
  return (
    typeof value === "string" &&
    (
      HEAD_SORT_MODES as readonly string[]
    ).includes(value)
  );
}
