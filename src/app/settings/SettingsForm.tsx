"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useRefresh } from "@/components/RefreshProvider";
import {
  updateProfile,
  deleteAccount,
} from "./actions";
import { CURRENCIES } from "@/lib/currencies";
import SearchableSelect, {
  type SelectOption,
} from "./SearchableSelect";

const FALLBACK_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

function tzOffsetLabel(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: zone,
        timeZoneName: "longOffset",
      }
    ).formatToParts(new Date());
    const raw =
      parts.find(
        (p) => p.type === "timeZoneName"
      )?.value ?? "";
    const normalized = raw.replace("GMT", "UTC");
    return normalized === "UTC" || !normalized
      ? "UTC+00:00"
      : normalized;
  } catch {
    return "";
  }
}

export default function SettingsForm({
  email,
  timezone,
  currency,
}: {
  email: string;
  timezone: string;
  currency: string;
}) {
  const router = useRouter();
  const { runRefresh } = useRefresh();

  const [tz, setTz] = useState(timezone);
  const [cur, setCur] = useState(currency);
  const [saving, setSaving] = useState<
    "timezone" | "currency" | null
  >(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [deleteMode, setDeleteMode] =
    useState(false);
  const [deleteConfirm, setDeleteConfirm] =
    useState("");
  const [deleting, setDeleting] =
    useState(false);
  const [deleteError, setDeleteError] =
    useState("");

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");

    const result = await deleteAccount();

    if (!result.success) {
      setDeleting(false);
      setDeleteError(
        result.error ??
          "Couldn't delete the account."
      );
      return;
    }

    window.location.href = "/";
  }

  const zoneOptions: SelectOption[] =
    useMemo(() => {
      let zones: string[] = FALLBACK_ZONES;
      try {
        const supported = (
          Intl as unknown as {
            supportedValuesOf?: (
              k: string
            ) => string[];
          }
        ).supportedValuesOf?.("timeZone");
        if (supported && supported.length) {
          zones = supported;
        }
      } catch {
        // keep fallback
      }
      if (!zones.includes(tz)) {
        zones = [tz, ...zones];
      }
      return zones.map((z) => {
        const off = tzOffsetLabel(z);
        const name = z.replace(/_/g, " ");
        return {
          value: z,
          label: off
            ? `${name}  ·  ${off}`
            : name,
          hint: `${off} ${z}`,
        };
      });
    }, [tz]);

  const currencyOptions: SelectOption[] =
    useMemo(
      () =>
        CURRENCIES.map((c) => ({
          value: c.code,
          label: `${c.label} (${c.code})`,
          hint: `${c.code} ${c.symbol}`,
        })),
      []
    );

  function save(
    field: "timezone" | "currency",
    next: string
  ) {
    setError("");
    setNote("");
    setSaving(field);

    if (field === "timezone") setTz(next);
    else setCur(next);

    runRefresh(async () => {
      const result = await updateProfile({
        [field]: next,
      });

      setSaving(null);

      if (!result.success) {
        setError(
          result.error ??
            "Couldn't save that."
        );
        if (field === "timezone")
          setTz(timezone);
        else setCur(currency);
        return;
      }

      setNote("Saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-[#34445e]">
          Email
        </label>
        <div className="w-full rounded-xl border border-[#c9ddea] bg-[#eef4f9] px-4 py-3 text-[#647086]">
          {email || "—"}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#34445e]">
          Timezone
        </label>
        <SearchableSelect
          value={tz}
          options={zoneOptions}
          onChange={(v) =>
            save("timezone", v)
          }
          disabled={saving !== null}
          placeholder="Choose a timezone"
        />
        <p className="mt-1.5 text-xs text-[#647086]">
          Used for &ldquo;due today&rdquo;, the
          month-end reminder, and which month opens
          by default.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#34445e]">
          Currency
        </label>
        <SearchableSelect
          value={cur}
          options={currencyOptions}
          onChange={(v) =>
            save("currency", v)
          }
          disabled={saving !== null}
          placeholder="Choose a currency"
        />
      </div>

      <div className="min-h-[20px] text-sm">
        {saving && (
          <span className="text-[#647086]">
            Saving&hellip;
          </span>
        )}
        {!saving && note && (
          <span className="text-emerald-700">
            {note}
          </span>
        )}
        {!saving && error && (
          <span className="text-red-600">
            {error}
          </span>
        )}
      </div>

      <div className="border-t border-[#f3b9cd] pt-5">
        {!deleteMode ? (
          <button
            type="button"
            onClick={() => setDeleteMode(true)}
            className="text-sm font-medium text-[#a94444] underline underline-offset-2 hover:text-[#7a2f2f]"
          >
            Delete account
          </button>
        ) : (
          <div className="rounded-xl border border-[#f0c9c9] bg-[#fdf3f3] p-4">
            <p className="text-sm font-semibold text-[#7a2f2f]">
              Delete your account?
            </p>
            <p className="mt-1 text-xs leading-5 text-[#a05a5a]">
              This permanently removes your account
              and every budget, expense and setting.
              It can&apos;t be undone.
            </p>

            <input
              value={deleteConfirm}
              onChange={(e) =>
                setDeleteConfirm(e.target.value)
              }
              placeholder="Type DELETE to confirm"
              className="mt-3 w-full rounded-lg border border-[#e0c3c3] bg-white px-3 py-2 text-sm text-[#26354d] outline-none focus:border-[#a94444]"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={
                  deleteConfirm !== "DELETE" ||
                  deleting
                }
                className="rounded-lg bg-[#a94444] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#8f3838] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Deleting…"
                  : "Delete forever"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteMode(false);
                  setDeleteConfirm("");
                  setDeleteError("");
                }}
                disabled={deleting}
                className="rounded-lg border border-[#e0c3c3] px-3 py-1.5 text-xs font-medium text-[#7a2f2f] hover:bg-[#f7e9e9] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {deleteError && (
              <p className="mt-2 text-xs text-red-600">
                {deleteError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
