import { describe, expect, it } from "vitest";

import {
  calculateCarryForward,
  calculateDailyBudget,
  calculateFinalBalance,
  calculateHeadState,
  calculateRemaining,
  calculateCommittedAmount,
  calculateCommittedBreakdown,
  calculateSpendingPool,
  calculateTotalAvailable,
  calculateTransfersIn,
  calculateTransfersOut,
  validateTransfer,
} from "./calculations";

describe("Budget calculations", () => {
    it("calculates the committed allocation breakdown", () => {
  const result = calculateCommittedBreakdown([
    { amount: 1666, headType: "Fixed Expense" },
    { amount: 407, headType: "Fixed Expense" },
    { amount: 333, headType: "Fixed Expense" },
    { amount: 83, headType: "Fixed Expense" },
    { amount: 166, headType: "Fixed Expense" },
    { amount: 3000, headType: "Fixed Expense" },
    { amount: 1500, headType: "Fixed Expense" },
    { amount: 195, headType: "Fixed Expense" },
    { amount: 5150, headType: "Investment" },
    { amount: 4000, headType: "Saving" },
  ]);

  expect(result).toEqual({
    fixedExpenses: 7350,
    investments: 5150,
    savings: 4000,
  });
    });
    it("calculates committed amount from fixed expenses, investments and savings", () => {
    const result = calculateCommittedAmount([
        {
        amount: 1666,
        headType: "Fixed Expense",
        },
        {
        amount: 5150,
        headType: "Investment",
        },
        {
        amount: 4000,
        headType: "Saving",
        },
    ]);

    expect(result).toBe(10816);
    });

    it("supports all current budget heads", () => {
    const result = calculateCommittedAmount([
        { amount: 1666, headType: "Fixed Expense" },
        { amount: 407, headType: "Fixed Expense" },
        { amount: 333, headType: "Fixed Expense" },
        { amount: 83, headType: "Fixed Expense" },
        { amount: 166, headType: "Fixed Expense" },
        { amount: 3000, headType: "Fixed Expense" },
        { amount: 1500, headType: "Fixed Expense" },
        { amount: 195, headType: "Fixed Expense" },
        { amount: 5150, headType: "Investment" },
        { amount: 4000, headType: "Saving" },
    ]);

    expect(result).toBe(16500);
    });

    it("does not include Other heads in committed amount", () => {
    const result = calculateCommittedAmount([
        { amount: 1000, headType: "Fixed Expense" },
        { amount: 5000, headType: "Investment" },
        { amount: 4000, headType: "Saving" },
        { amount: 2000, headType: "Other" },
    ]);

    expect(result).toBe(10000);
    });
    it("calculates total available", () => {
    expect(
      calculateTotalAvailable(4000, 6575)
    ).toBe(10575);
  });

  it("calculates remaining balance", () => {
    expect(
      calculateRemaining(3000, 425)
    ).toBe(2575);
  });

  it("calculates transfers out", () => {
    const transfers = [
      {
        sourceHeadId: "electricity",
        destinationHeadId: "emergency",
        amount: 2575,
      },
      {
        sourceHeadId: "gym",
        destinationHeadId: "emergency",
        amount: 500,
      },
      {
        sourceHeadId: "electricity",
        destinationHeadId: "saving",
        amount: 100,
      },
    ];

    expect(
      calculateTransfersOut("electricity", transfers)
    ).toBe(2675);
  });

  it("calculates transfers in", () => {
    const transfers = [
      {
        sourceHeadId: "electricity",
        destinationHeadId: "emergency",
        amount: 2575,
      },
      {
        sourceHeadId: "gym",
        destinationHeadId: "emergency",
        amount: 500,
      },
      {
        sourceHeadId: "apple",
        destinationHeadId: "emergency",
        amount: 100,
      },
    ];

    expect(
      calculateTransfersIn("emergency", transfers)
    ).toBe(3175);
  });

  it("calculates final balance", () => {
    expect(
      calculateFinalBalance(2575, 2575, 0)
    ).toBe(0);

    expect(
      calculateFinalBalance(2575, 0, 3175)
    ).toBe(5750);
  });

  it("calculates carry forward", () => {
    expect(
      calculateCarryForward(6575)
    ).toBe(6575);
  });

  it("calculates spending pool", () => {
    expect(
      calculateSpendingPool(31500, 16500)
    ).toBe(15000);
  });

  it("calculates daily budget using calendar days", () => {
    expect(
      calculateDailyBudget(15000, 31)
    ).toBeCloseTo(483.8709677);
  });

  it("rejects a transfer greater than the available balance", () => {
    const result = validateTransfer(
      4000,
      2575,
      "electricity",
      "emergency"
    );

    expect(result.valid).toBe(false);
  });

  it("rejects a transfer to the same head", () => {
    const result = validateTransfer(
      500,
      2575,
      "electricity",
      "electricity"
    );

    expect(result.valid).toBe(false);
  });

  it("accepts a valid transfer", () => {
    const result = validateTransfer(
      2575,
      2575,
      "electricity",
      "emergency"
    );

    expect(result.valid).toBe(true);
  });

  it("handles missing values safely", () => {
    expect(
      calculateTotalAvailable(null, undefined)
    ).toBe(0);

    expect(
      calculateRemaining(undefined, null)
    ).toBe(0);

    expect(
      calculateDailyBudget(15000, 0)
    ).toBe(0);
  });

  it("handles the complete electricity example", () => {
    const head = {
      id: "electricity",
      allocatedAmount: 3000,
      carryForward: 0,
      paidAmount: 425,
    };

    const transfers = [
      {
        sourceHeadId: "electricity",
        destinationHeadId: "emergency",
        amount: 2575,
      },
    ];

    const state = calculateHeadState(
      head,
      transfers
    );

    expect(state.totalAvailable).toBe(3000);
    expect(state.remaining).toBe(2575);
    expect(state.transfersOut).toBe(2575);
    expect(state.transfersIn).toBe(0);
    expect(state.finalBalance).toBe(0);
    expect(state.carryForward).toBe(0);
  });

  it("handles unused money carrying forward", () => {
    const head = {
      id: "electricity",
      allocatedAmount: 3000,
      carryForward: 0,
      paidAmount: 425,
    };

    const state = calculateHeadState(
      head,
      []
    );

    expect(state.totalAvailable).toBe(3000);
    expect(state.remaining).toBe(2575);
    expect(state.transfersOut).toBe(0);
    expect(state.transfersIn).toBe(0);
    expect(state.finalBalance).toBe(2575);
    expect(state.carryForward).toBe(2575);
  });
});
