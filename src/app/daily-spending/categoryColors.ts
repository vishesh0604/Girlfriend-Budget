// Colours a user can assign to a spending category. The same list is the
// swatch grid in Manage categories, the validation whitelist is just the
// hex-format check below (custom picks are allowed too), and the first
// eight double as the positional fallback for categories left on "Auto".

export const CATEGORY_COLOR_PRESETS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#0f9b9b",
  "#d4488a",
  "#a855f7",
  "#5b7c1f",
  "#c2620c",
  "#64748b",
];

export function isValidCategoryColor(
  value: string
) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

const NAVY_INK = "#26354d";
const WHITE_INK = "#ffffff";

function relativeLuminance(hex: string) {
  const channel = (start: number) => {
    const value =
      parseInt(
        hex.slice(start, start + 2),
        16
      ) / 255;

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(1) +
    0.7152 * channel(3) +
    0.0722 * channel(5)
  );
}

const NAVY_LUMINANCE =
  relativeLuminance(NAVY_INK);

// The ink colour (navy or white) with the better contrast on a solid
// `hex` fill - picked per colour rather than by a single threshold.
export function readableTextOn(hex: string) {
  if (!isValidCategoryColor(hex)) {
    return NAVY_INK;
  }

  const luminance = relativeLuminance(hex);

  const contrastWithWhite =
    1.05 / (luminance + 0.05);
  const contrastWithNavy =
    (luminance + 0.05) /
    (NAVY_LUMINANCE + 0.05);

  return contrastWithWhite >= contrastWithNavy
    ? WHITE_INK
    : NAVY_INK;
}
