"use client";

import { useState } from "react";

import { generateSpendingReport } from "./actions";
import type { SpendingReport } from "./spendingReport";

type MonthlyReportButtonProps = {
  monthStart: string;
};

function todayString() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export default function MonthlyReportButton({
  monthStart,
}: MonthlyReportButtonProps) {
  const [open, setOpen] = useState(false);

  const [fromDate, setFromDate] =
    useState(monthStart);
  const [toDate, setToDate] = useState(
    todayString()
  );

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] =
    useState(false);
  const [error, setError] = useState("");
  const [report, setReport] =
    useState<SpendingReport | null>(null);

  function clearReport() {
    setReport(null);
    setError("");
  }

  async function handleGenerate() {
    setError("");
    setLoading(true);
    setReport(null);

    const result = await generateSpendingReport(
      fromDate,
      toDate
    );

    setLoading(false);

    if (!result.success) {
      setError(
        result.error ??
          "Could not build the report."
      );
      return;
    }

    setReport(result.report);
  }

  async function handleDownload() {
    if (!report || downloading) {
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const [{ pdf }, { SpendingReportPdf }] =
        await Promise.all([
          import("@react-pdf/renderer"),
          import("./SpendingReportPdf"),
        ]);

      const blob = await pdf(
        <SpendingReportPdf report={report} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `spending-report_${report.from}_to_${report.to}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        2000
      );
    } catch {
      setError(
        "Could not build the PDF. Try again."
      );
    } finally {
      setDownloading(false);
    }
  }

  function handleClose() {
    setOpen(false);
  }

  function handleOpen() {
    setOpen(true);
    setError("");
    setReport(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="shrink-0 rounded-lg border border-[#f3b9cd] bg-[#ffdce9] px-2.5 py-1 text-xs font-medium text-[#c4567d] transition hover:bg-[#ffe8f0]"
      >
        Monthly report
      </button>

      {open && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div className="popup-panel w-full max-w-md rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-[#26354d]">
              Monthly report
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#647086]">
              A full spending report for any date range
              &mdash; pool, spent and remaining, the
              category chart, and every transaction.
              Downloads as a PDF.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-[#647086]">
                  From
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate}
                    onChange={(event) => {
                      setFromDate(
                        event.target.value
                      );
                      clearReport();
                    }}
                    className="mt-1 block rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                  />
                </label>

                <label className="text-xs font-medium text-[#647086]">
                  To
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    max={todayString()}
                    onChange={(event) => {
                      setToDate(
                        event.target.value
                      );
                      clearReport();
                    }}
                    className="mt-1 block rounded-lg border border-[#c9ddea] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f8fbd]"
                  />
                </label>
              </div>

              {report ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {downloading
                      ? "Preparing PDF..."
                      : "Download PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="rounded-lg border border-[#f3b9cd] px-3 py-1.5 text-xs font-medium text-[#647086] hover:bg-[#ffe8f0]"
                  >
                    Rebuild
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {loading
                    ? "Building..."
                    : "Generate report"}
                </button>
              )}

              {report && !error && (
                <p className="text-xs text-[#647086]">
                  Report ready &mdash;{" "}
                  {report.entries.length} transaction
                  {report.entries.length === 1
                    ? ""
                    : "s"}{" "}
                  across {report.months.length}{" "}
                  month
                  {report.months.length === 1
                    ? ""
                    : "s"}
                  .
                </p>
              )}

              {error && (
                <p className="text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-[#f3b9cd] px-4 py-2 text-sm font-medium text-[#647086] hover:bg-[#ffe8f0]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
