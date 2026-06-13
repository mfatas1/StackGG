// Deterministic WCAG contrast audit computed from the OKLCH design tokens.
// No browser needed; matches the literal values in DESIGN.md / tailwind.config.

const T = {
  bg: [0.155, 0.01, 60],
  surface2: [0.235, 0.014, 60],
  surface3: [0.275, 0.016, 60],
  ink: [0.965, 0.008, 80],
  inkDim: [0.8, 0.012, 80],
  inkFaint: [0.64, 0.012, 80],
  primary: [0.73, 0.17, 45],
  primaryOn: [0.205, 0.03, 45],
  win: [0.8, 0.165, 150],
  loss: [0.66, 0.19, 25],
  gold: [0.815, 0.13, 85],
};

function oklchToLinear([L, C, H]) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}
const lum = (t) => {
  const [r, g, b] = oklchToLinear(t);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (x, y) => {
  const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
};

const pairs = [
  ["body text on bg", T.ink, T.bg, 4.5],
  ["secondary on card", T.inkDim, T.surface2, 4.5],
  ["meta on card", T.inkFaint, T.surface2, 3.0],
  ["button label on primary", T.primaryOn, T.primary, 4.5],
  ["accent on bg", T.primary, T.bg, 3.0],
  ["win on bg", T.win, T.bg, 3.0],
  ["loss on bg", T.loss, T.bg, 3.0],
  ["gold on bg", T.gold, T.bg, 3.0],
];

let fails = 0;
for (const [label, fg, bg, min] of pairs) {
  const r = Math.round(ratio(fg, bg) * 100) / 100;
  const pass = r >= min;
  if (!pass) fails++;
  console.log(`${pass ? "✓" : "✗"} ${label.padEnd(26)} ${String(r).padEnd(6)}:1  (min ${min})`);
}
process.exit(fails ? 1 : 0);
