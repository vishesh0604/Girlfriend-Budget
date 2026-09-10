"use client";

import { useState } from "react";

import PopupCloseButton from "@/components/PopupCloseButton";
import SettingsForm from "./SettingsForm";
import { getMyProfile } from "./actions";

type Profile = {
  email: string;
  timezone: string;
  currency: string;
};

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openModal() {
    setOpen(true);
    setError("");
    // Always refetch so a reopened modal shows the current values.
    if (!profile) setLoading(true);

    const result = await getMyProfile();

    setLoading(false);

    if (result.success) {
      setProfile(result.profile);
    } else {
      setError(
        result.error ??
          "Couldn't load your settings."
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Settings"
        title="Settings"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#f3b9cd] bg-[#ffe8f0] text-[#c4567d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffdce9] hover:shadow-md"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="7" x2="14" y2="7" />
          <line x1="18" y1="7" x2="20" y2="7" />
          <circle cx="16" cy="7" r="2" />
          <line x1="4" y1="17" x2="8" y2="17" />
          <line x1="12" y1="17" x2="20" y2="17" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>

      {open && (
        <div
          className="popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setOpen(false);
            }
          }}
        >
          <div className="popup-panel relative w-full max-w-md rounded-3xl border border-[#f3b9cd] bg-[#ffdce9] shadow-xl">
            <div className="border-b border-[#f3b9cd] px-6 pb-4 pt-6">
              <h2 className="pr-10 text-lg font-semibold tracking-tight text-[#26354d]">
                Settings
              </h2>
              <p className="mt-1 text-sm text-[#647086]">
                Your account and preferences &mdash;
                changes save as you pick them.
              </p>
            </div>

            <PopupCloseButton
              onClick={() => setOpen(false)}
            />

            <div className="px-6 py-5">
              {loading && (
                <p className="text-sm text-[#647086]">
                  Loading&hellip;
                </p>
              )}

              {!loading && error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              {!loading && profile && (
                <SettingsForm
                  key={`${profile.timezone}|${profile.currency}`}
                  email={profile.email}
                  timezone={profile.timezone}
                  currency={profile.currency}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
