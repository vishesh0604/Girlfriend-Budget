export type BudgetHeadRecord = {
  id: string;
  allocatedAmount?: number | null;
  carryForward?: number | null;
  paidAmount?: number | null;
};

export type TransferRecord = {
  sourceHeadId: string;
  destinationHeadId: string;
  amount?: number | null;
};

export type TransferValidation 
 = {
  valid: boolean;
  error?: string;
};

export type BudgetHeadType =
  | "fixed_expense"
  | "investment"
  | "saving"
  | "other";
function safeAmount(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

export function calculateTotalAvailable(
  allocatedAmount: number | null | undefined,
  carryForward: number | null | undefined
): number {
  return (
    safeAmount(allocatedAmount) +
    safeAmount(carryForward)
  );
}

export function calculateRemaining(
  totalAvailable: number | null | undefined,
  paidAmount: number | null | undefined
): number {
  return (
    safeAmount(totalAvailable) -
    safeAmount(paidAmount)
  );
}

export function calculateTransfersOut(
  headId: string,
  transfers: TransferRecord[]
): number {
  return transfers.reduce((total, transfer) => {
    if (transfer.sourceHeadId !== headId) {
      return total;
    }

    return total + safeAmount(transfer.amount);
  }, 0);
}

export function calculateTransfersIn(
  headId: string,
  transfers: TransferRecord[]
): number {
  return transfers.reduce((total, transfer) => {
    if (transfer.destinationHeadId !== headId) {
      return total;
    }

    return total + safeAmount(transfer.amount);
  }, 0);
}

export function calculateFinalBalance(
  remaining: number | null | undefined,
  transfersOut: number | null | undefined,
  transfersIn: number | null | undefined
): number {
  return (
    safeAmount(remaining) -
    safeAmount(transfersOut) +
    safeAmount(transfersIn)
  );
}

export function calculateCarryForward(
  finalBalance: number | null | undefined
): number {
  return safeAmount(finalBalance);
}

export function calculateSpendingPool(
  salary: number | null | undefined,
  committedAmount: number | null | undefined
): number {
  return (
    safeAmount(salary) -
    safeAmount(committedAmount)
  );
}

export function calculateDailyBudget(
  spendingPool: number | null | undefined,
  numberOfDays: number | null | undefined
): number {
  const pool = safeAmount(spendingPool);
  const days = safeAmount(numberOfDays);

  if (days <= 0) {
    return 0;
  }

  return pool / days;
}

export function validateTransfer(
  amount: number | null | undefined,
  availableBalance: number | null | undefined,
  sourceHeadId: string,
  destinationHeadId: string
): TransferValidation {
  const transferAmount = safeAmount(amount);
  const available = safeAmount(availableBalance);

  if (sourceHeadId === destinationHeadId) {
    return {
      valid: false,
      error: "A budget head cannot transfer money to itself.",
    };
  }

  if (transferAmount <= 0) {
    return {
      valid: false,
      error: "Transfer amount must be greater than ₹0.",
    };
  }

  if (transferAmount > available) {
    return {
      valid: false,
      error: `You can transfer a maximum of ₹${available.toLocaleString(
        "en-IN"
      )}.`,
    };
  }

  return {
    valid: true,
  };
}

export function calculateCommittedAmount(
  heads: Array<{
    amount?: number | null;
    headType?: string | null;
  }>
  
): number {
  return heads.reduce((total, head) => {
    const amount = safeAmount(head.amount);
    const normalizedType = (head.headType ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const isCommitted =
      normalizedType === "fixed_expense" ||
      normalizedType === "investment" ||
      normalizedType === "saving";

    return isCommitted
      ? total + amount
      : total;
  }, 0);
}
export function calculateCommittedBreakdown(
  heads: Array<{
    amount?: number | null;
    headType?: string | null;
  }>
) {
  return heads.reduce(
    (totals, head) => {
      const amount = safeAmount(head.amount);

      const normalizedType = (head.headType ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

      if (normalizedType === "fixed_expense") {
        totals.fixedExpenses += amount;
      } else if (normalizedType === "investment") {
        totals.investments += amount;
      } else if (normalizedType === "saving") {
        totals.savings += amount;
      }

      return totals;
    },
    {
      fixedExpenses: 0,
      investments: 0,
      savings: 0,
    }
  );
}

export function calculateHeadState(
  head: BudgetHeadRecord,
  transfers: TransferRecord[]
) {
  const totalAvailable = calculateTotalAvailable(
    head.allocatedAmount,
    head.carryForward
  );

  const remaining = calculateRemaining(
    totalAvailable,
    head.paidAmount
  );

  const transfersOut = calculateTransfersOut(
    head.id,
    transfers
  );

  const transfersIn = calculateTransfersIn(
    head.id,
    transfers
  );

  const finalBalance = calculateFinalBalance(
    remaining,
    transfersOut,
    transfersIn
  );

  const carryForward = calculateCarryForward(
    finalBalance
  );

  return {
    totalAvailable,
    remaining,
    transfersOut,
    transfersIn,
    finalBalance,
    carryForward,
  };
}
export function calculateBankAccountAllocation(
  heads: Array<{
    amount?: number | null;
    headType?: string | null;
  }>
): number {
  return heads.reduce((total, head) => {
    const amount = safeAmount(head.amount);

    const normalizedType = (head.headType ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const isBankAccountEligible =
      normalizedType === "fixed_expense" ||
      normalizedType === "investment";

    return isBankAccountEligible
      ? total + amount
      : total;
  }, 0);
}

export function calculateBankAccountPaidAmount(
  heads: Array<{
    paidAmount?: number | null;
    headType?: string | null;
  }>
): number {
  return heads.reduce((total, head) => {
    const paidAmount = safeAmount(
      head.paidAmount
    );

    const normalizedType = (head.headType ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const isBankAccountEligible =
      normalizedType === "fixed_expense" ||
      normalizedType === "investment";

    return isBankAccountEligible
      ? total + paidAmount
      : total;
  }, 0);
}

export function calculateBankAccountEndingBalance(
  startingBalance: number | null | undefined,
  fixedInvestmentAllocation:
    | number
    | null
    | undefined,
  paidAmount: number | null | undefined
): number {
  return (
    safeAmount(startingBalance) +
    safeAmount(fixedInvestmentAllocation) -
    safeAmount(paidAmount)
  );
}
export function calculateBankAccountFromMonthlyHeads(
  heads: Array<{
    allocated_amount?: number | null;
    paid_amount?: number | null;
    budget_heads?: {
      head_type?: string | null;
    } | Array<{
      head_type?: string | null;
    }> | null;
  }>
) {
  const calculationHeads = heads.map((head) => {
    const budgetHead = Array.isArray(
      head.budget_heads
    )
      ? head.budget_heads[0]
      : head.budget_heads;

    return {
      amount: Number(
        head.allocated_amount ?? 0
      ),
      paidAmount: Number(
        head.paid_amount ?? 0
      ),
      headType:
        budgetHead?.head_type ?? "other",
    };
  });

  const allocation =
    calculateBankAccountAllocation(
      calculationHeads
    );

  const paid =
    calculateBankAccountPaidAmount(
      calculationHeads
    );

  return {
    fixedInvestmentAllocation:
      allocation,
    paidAmount: paid,
  };
}

