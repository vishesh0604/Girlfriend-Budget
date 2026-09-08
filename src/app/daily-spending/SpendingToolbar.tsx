"use client";

import { useState } from "react";

import AddExpenseButton from "./AddExpenseButton";
import AddCreditButton from "./AddCreditButton";
import SpendingCalendar from "./SpendingCalendar";
import MoveRemainingButton from "./MoveRemainingButton";
import ManageCategoriesButton from "./ManageCategoriesButton";

type CategoryOption = {
  id: string;
  name: string;
};

type CategoryListItem = {
  id: string;
  name: string;
  isDefault: boolean;
  color: string | null;
  entryCount: number;
};

type SpendingEntry = {
  id: string;
  entryDate: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  amount: number;
  note: string;
};

type FixedHead = {
  id: string;
  name: string;
};

type ExistingMove = {
  id: string;
  amount: number;
  label: string;
};

type SpendingToolbarProps = {
  monthStart: string;
  daysInMonth: number;
  defaultDay: number;
  todayDay: number | null;
  remaining: number;
  categoryOptions: CategoryOption[];
  categoryList: CategoryListItem[];
  entries: SpendingEntry[];
  fixedHeads: FixedHead[];
  moves: ExistingMove[];
};

export default function SpendingToolbar(
  props: SpendingToolbarProps
) {
  const {
    monthStart,
    daysInMonth,
    defaultDay,
    todayDay,
    remaining,
    categoryOptions,
    categoryList,
    entries,
    fixedHeads,
    moves,
  } = props;

  const [moreOpen, setMoreOpen] = useState(false);

  const addExpense = (
    <AddExpenseButton
      categories={categoryOptions}
      monthStart={monthStart}
      daysInMonth={daysInMonth}
      defaultDay={defaultDay}
    />
  );

  const addCredit = (
    <AddCreditButton
      monthStart={monthStart}
      daysInMonth={daysInMonth}
      defaultDay={defaultDay}
    />
  );

  const secondary = (
    <>
      <SpendingCalendar
        entries={entries}
        categories={categoryOptions}
        monthStart={monthStart}
        daysInMonth={daysInMonth}
        todayDay={todayDay}
      />

      <MoveRemainingButton
        monthStart={monthStart}
        remaining={remaining}
        fixedHeads={fixedHeads}
        moves={moves}
      />

      <ManageCategoriesButton
        categories={categoryList}
      />
    </>
  );

  return (
    <>
      {/* Desktop: all buttons inline */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {addExpense}
        {addCredit}
        {secondary}
      </div>

      {/* Mobile: only Add expense outside; the rest under More */}
      <div className="relative flex items-center gap-2 sm:hidden">
        {addExpense}

        <button
          type="button"
          onClick={() =>
            setMoreOpen((open) => !open)
          }
          aria-expanded={moreOpen}
          className="rounded-xl border border-[#f3b9cd] bg-[#ffdce9] px-4 py-2 text-sm font-medium text-[#c4567d] shadow-sm transition hover:bg-[#ffe8f0]"
        >
          More
        </button>

        {moreOpen && (
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />

            <div className="popup-panel absolute right-0 top-[calc(100%+0.5rem)] z-40 flex min-w-[190px] origin-top-right flex-col items-stretch gap-2 rounded-2xl border border-[#f3b9cd] bg-[#ffdce9] p-2 shadow-xl [&>button]:w-full">
              {addCredit}
              {secondary}
            </div>
          </>
        )}
      </div>
    </>
  );
}
