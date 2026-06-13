// Deterministic WCAG contrast audit for the Hextech palette (hex tokens).
const T = {
  bg: "#010A13",
  surface2: "#0F1F30",
  surface3: "#16293E",
  ink: "#F0E6D2",
  inkDim: "#A09B8C",
  inkFaint: "#7A8A99",
  gold: "#C89B3C",
  goldOn: "#06101C",
  win: "#0AC8B9",
  loss: "#E84057",
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = hex(h).map(lin);
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
  ["gold label on gold btn", T.goldOn, T.gold, 4.5],
  ["gold accent on bg", T.gold, T.bg, 3.0],
  ["win on bg", T.win, T.bg, 3.0],
  ["loss on bg", T.loss, T.bg, 3.0],
  ["win on card", T.win, T.surface2, 3.0],
  ["loss on card", T.loss, T.surface2, 3.0],
];

let fails = 0;
for (const [label, fg, bg, min] of pairs) {
  const r = Math.round(ratio(fg, bg) * 100) / 100;
  const pass = r >= min;
  if (!pass) fails++;
  console.log(`${pass ? "✓" : "✗"} ${label.padEnd(24)} ${String(r).padEnd(6)}:1  (min ${min})`);
}
process.exit(fails ? 1 : 0);
