"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

type TransitionType =
  | "login"
  | "dashboard"
  | "customize"
  | "home"
  | "logout";

type PageTransitionProps = {
  href: string;
  type: TransitionType;
  children: ReactNode;
  className?: string;
};

const transitionContent = {
  login: {
    title: "Welcome back",
    subtitle: "Opening your budget...",
    icon: "₹",
    background: "#ffdce9",
    border: "#f3b9cd",
    iconBackground: "#ffe8f0",
    iconColor: "#4f8fbd",
  },

  dashboard: {
    title: "Opening your budget",
    subtitle: "Getting everything ready...",
    icon: "₹",
    background: "#ffdce9",
    border: "#f3b9cd",
    iconBackground: "#ffe8f0",
    iconColor: "#4f8fbd",
  },

  customize: {
    title: "Preparing your budget",
    subtitle: "Opening your budget settings...",
    icon: "✦",
    background: "#ffdce9",
    border: "#f3b9cd",
    iconBackground: "#ffe8f0",
    iconColor: "#d96b91",
  },

  home: {
    title: "Returning home",
    subtitle: "Taking you back to your budget hub...",
    icon: "⌂",
    background: "#ffdce9",
    border: "#f3b9cd",
    iconBackground: "#ffe8f0",
    iconColor: "#4f8fbd",
  },

  logout: {
    title: "See you soon",
    subtitle: "Signing you out securely...",
    icon: "→",
    background: "#ffdce9",
    border: "#f3b9cd",
    iconBackground: "#ffe8f0",
    iconColor: "#d96b91",
  },
};

function LoadingOverlay({
  type,
}: {
  type: TransitionType;
}) {
  const content = transitionContent[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#e5f6ff]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm"
          style={{
            backgroundColor:
              content.background,
            border: `1px solid ${content.border}`,
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-semibold"
            style={{
              backgroundColor:
                content.iconBackground,
              color: content.iconColor,
            }}
          >
            {content.icon}
          </div>

          <div
            className="absolute inset-0 animate-ping rounded-2xl opacity-25"
            style={{
              border: `1px solid ${content.border}`,
            }}
          />
        </div>

        {/* Text */}
        <h1 className="text-xl font-semibold tracking-tight text-[#26354d]">
          {content.title}
        </h1>

        <p className="mt-1.5 text-sm text-[#647086]">
          {content.subtitle}
        </p>

        {/* Dots */}
        <div className="mt-5 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]"
            style={{
              animationDelay: "-0.2s",
            }}
          />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]"
            style={{
              animationDelay: "-0.1s",
            }}
          />

          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#26354d]" />
        </div>
      </div>
    </div>
  );
}

export default function PageTransition({
  href,
  type,
  children,
  className,
}: PageTransitionProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  function handleNavigation(
    event: React.MouseEvent<HTMLAnchorElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      router.push(href);
    }, 1000);
  }

  return (
    <>
      <a
        href={href}
        onClick={handleNavigation}
        className={className}
        aria-disabled={loading}
      >
        {children}
      </a>

      {loading && (
        <LoadingOverlay type={type} />
      )}
    </>
  );
}
