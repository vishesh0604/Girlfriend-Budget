"use client";

import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  Circle,
  StyleSheet,
} from "@react-pdf/renderer";

import {
  computeReportModel,
  pdfMoney,
  REPORT_TRACK_COLOR,
  DONUT_STROKE,
  type SpendingReport,
} from "./spendingReport";

const NAVY = "#26354d";
const MUTED = "#8a94a6";
const SUBTLE = "#647086";
const LINE = "#eedbe4";
const PINK = "#f3b9cd";
const CREDIT = "#047857";
const MOVE = "#8a7440";
const DASH = "—";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 20,
    paddingHorizontal: 22,
    fontSize: 9,
    color: NAVY,
    fontFamily: "Helvetica",
  },
  card: {
    borderWidth: 1,
    borderColor: "#ecccdb",
    borderRadius: 9,
    padding: 13,
  },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  rangeLine: { fontSize: 9, color: SUBTLE, marginTop: 2 },
  genLine: { fontSize: 8, color: MUTED, marginTop: 1 },
  headRule: {
    borderBottomWidth: 2,
    borderBottomColor: PINK,
    marginTop: 6,
    marginBottom: 9,
  },
  statRow: { flexDirection: "row", gap: 7 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 7,
    padding: 6,
    backgroundColor: "#fff5f9",
  },
  statLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 0.4 },
  statValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
  meta: { fontSize: 8, color: SUBTLE, marginTop: 6 },
  h2: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 11,
    marginBottom: 4,
  },
  h3: {
    fontSize: 7.5,
    color: SUBTLE,
    letterSpacing: 0.4,
    marginTop: 7,
    marginBottom: 2,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  donutWrap: { width: 100, height: 100, position: "relative" },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  donutLabel: { fontSize: 6, color: MUTED, letterSpacing: 0.6 },
  donutValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  table: { flex: 1 },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 2.5,
  },
  th: { fontSize: 6.5, color: MUTED, letterSpacing: 0.4 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 2,
  },
  td: { fontSize: 8 },
  num: { textAlign: "right" },
  cellName: { flexDirection: "row", alignItems: "center" },
  swatch: {
    width: 6,
    height: 6,
    borderRadius: 2,
    marginRight: 4,
  },
  foot: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: LINE,
    fontSize: 7.5,
    color: MUTED,
  },
});

export function SpendingReportPdf({
  report,
  currency,
}: {
  report: SpendingReport;
  currency: string;
}) {
  const model = computeReportModel(report);
  const rupees = (amount: number) =>
    pdfMoney(amount, currency);

  const meta = [
    `Credited ${rupees(model.totalCredited)}`,
    `Moved out ${rupees(model.totalMoved)}`,
    `${model.transactionCount} transaction${
      model.transactionCount === 1 ? "" : "s"
    }`,
    `${model.days} day${model.days === 1 ? "" : "s"}`,
    `Avg ${rupees(model.perDay)}/day`,
  ].join("   ·   ");

  const stats: [string, string][] = [
    [
      "TOTAL POOL",
      model.totalPool === null
        ? DASH
        : rupees(model.totalPool),
    ],
    ["SPENT", rupees(model.totalSpent)],
    [
      "REMAINING",
      model.totalRemaining === null
        ? DASH
        : rupees(model.totalRemaining),
    ],
  ];

  return (
    <Document
      title={`Spending report ${report.from} to ${report.to}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.h1}>Spending report</Text>
          <Text style={styles.rangeLine}>
            {model.rangeLabel}
          </Text>
          <Text style={styles.genLine}>
            Generated {model.generatedOn}
          </Text>
          <View style={styles.headRule} />

          <View style={styles.statRow} wrap={false}>
            {stats.map(([label, value]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statLabel}>
                  {label}
                </Text>
                <Text style={styles.statValue}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.meta}>{meta}</Text>

          {model.slices.length > 0 && (
            <View style={styles.chartRow} wrap={false}>
              <View style={styles.donutWrap}>
                <Svg
                  viewBox="0 0 200 200"
                  style={{ width: 100, height: 100 }}
                >
                  <Circle
                    cx={100}
                    cy={100}
                    r={80}
                    stroke={REPORT_TRACK_COLOR}
                    strokeWidth={DONUT_STROKE}
                    fill="none"
                  />
                  {model.slices.map((slice, index) =>
                    slice.isFull ? (
                      <Circle
                        key={index}
                        cx={100}
                        cy={100}
                        r={80}
                        stroke={slice.color}
                        strokeWidth={DONUT_STROKE}
                        fill="none"
                      />
                    ) : slice.pathD ? (
                      <Path
                        key={index}
                        d={slice.pathD}
                        stroke={slice.color}
                        strokeWidth={DONUT_STROKE}
                        fill="none"
                      />
                    ) : null
                  )}
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutLabel}>
                    {model.donutCenterLabel}
                  </Text>
                  <Text style={styles.donutValue}>
                    {rupees(model.donutTotal)}
                  </Text>
                </View>
              </View>

              <View style={styles.table}>
                <View style={styles.thRow}>
                  <Text style={[styles.th, { flex: 3 }]}>
                    SLICE
                  </Text>
                  <Text
                    style={[
                      styles.th,
                      styles.num,
                      { flex: 1.4 },
                    ]}
                  >
                    AMOUNT
                  </Text>
                  <Text
                    style={[
                      styles.th,
                      styles.num,
                      { flex: 1 },
                    ]}
                  >
                    SHARE
                  </Text>
                </View>

                {model.slices.map((slice, index) => (
                  <View key={index} style={styles.tr}>
                    <View
                      style={[
                        styles.cellName,
                        { flex: 3 },
                      ]}
                    >
                      <View
                        style={[
                          styles.swatch,
                          {
                            backgroundColor:
                              slice.color,
                          },
                        ]}
                      />
                      <Text style={styles.td}>
                        {slice.label}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.td,
                        styles.num,
                        { flex: 1.4 },
                      ]}
                    >
                      {rupees(slice.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        styles.num,
                        { flex: 1 },
                      ]}
                    >
                      {slice.sharePct > 0 &&
                      slice.sharePct < 1
                        ? "<1%"
                        : `${Math.round(
                            slice.sharePct
                          )}%`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {model.months.length > 0 && (
            <View>
              <Text style={styles.h2}>
                {model.months.length > 1
                  ? "By month"
                  : "Month"}
              </Text>
              <View style={styles.thRow}>
                {(
                  [
                    ["MONTH", 1.6, false],
                    ["POOL", 1, true],
                    ["SPENT", 1, true],
                    ["CREDITED", 1, true],
                    ["MOVED OUT", 1, true],
                    ["REMAINING", 1, true],
                  ] as [string, number, boolean][]
                ).map(([label, flex, right]) => (
                  <Text
                    key={label}
                    style={[
                      styles.th,
                      right ? styles.num : {},
                      { flex },
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              {model.months.map((month) => (
                <View key={month.month} style={styles.tr}>
                  <Text style={[styles.td, { flex: 1.6 }]}>
                    {new Date(
                      `${month.month}T00:00:00`
                    ).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  {[
                    month.pool,
                    month.spent,
                    month.credited,
                    month.movedOut,
                    month.remaining,
                  ].map((value, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.td,
                        styles.num,
                        { flex: 1 },
                      ]}
                    >
                      {value === null
                        ? DASH
                        : rupees(value)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {model.monthSections.length > 0 && (
            <View>
              <Text style={styles.h2}>
                All transactions
              </Text>
              {model.monthSections.map((section) => (
                <View key={section.label}>
                  <Text style={styles.h3}>
                    {section.label.toUpperCase()}
                  </Text>
                  <View style={styles.thRow}>
                    <Text
                      style={[styles.th, { flex: 1.5 }]}
                    >
                      DATE
                    </Text>
                    <Text
                      style={[styles.th, { flex: 1.5 }]}
                    >
                      CATEGORY
                    </Text>
                    <Text
                      style={[styles.th, { flex: 2 }]}
                    >
                      NOTE
                    </Text>
                    <Text
                      style={[
                        styles.th,
                        styles.num,
                        { flex: 1.2 },
                      ]}
                    >
                      AMOUNT
                    </Text>
                  </View>
                  {section.rows.map((row, index) => {
                    const tone =
                      row.kind === "credit"
                        ? CREDIT
                        : row.kind === "move"
                        ? MOVE
                        : NAVY;
                    const prefix =
                      row.kind === "credit"
                        ? "+"
                        : row.kind === "move"
                        ? "-"
                        : "";

                    return (
                      <View key={index} style={styles.tr}>
                        <Text
                          style={[
                            styles.td,
                            { flex: 1.5, color: SUBTLE },
                          ]}
                        >
                          {row.date}
                        </Text>
                        <Text
                          style={[
                            styles.td,
                            { flex: 1.5, color: tone },
                          ]}
                        >
                          {row.label}
                        </Text>
                        <Text
                          style={[
                            styles.td,
                            { flex: 2, color: tone },
                          ]}
                        >
                          {row.note}
                        </Text>
                        <Text
                          style={[
                            styles.td,
                            styles.num,
                            { flex: 1.2, color: tone },
                          ]}
                        >
                          {prefix}
                          {rupees(row.amount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.foot}>Her Penny</Text>
        </View>
      </Page>
    </Document>
  );
}
