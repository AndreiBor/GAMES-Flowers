export const flowerTypes = {
  red: {
    name: "Красный цветок", singular: "красный", plural: "красных",
    count: 5, length: 34, width: 15,
    light: "#ff9d8e", mid: "#f5636a", dark: "#a83446", center: "#6e3144", pollen: "#ffd084",
  },
  blue: {
    name: "Синий цветок", singular: "синий", plural: "синих",
    count: 7, length: 37, width: 11,
    light: "#a7caff", mid: "#527fe1", dark: "#354ca2", center: "#424699", pollen: "#ffdf86",
  },
  green: {
    name: "Зелёный цветок", singular: "зелёный", plural: "зелёных",
    count: 6, length: 35, width: 13,
    light: "#91efae", mid: "#4cbd85", dark: "#207854", center: "#278264", pollen: "#f4ea94",
  },
  yellow: {
    name: "Жёлтый цветок", singular: "жёлтый", plural: "жёлтых",
    count: 8, length: 36, width: 9,
    light: "#fff3a6", mid: "#ffcb52", dark: "#ac6c24", center: "#c17a29", pollen: "#fff1ae",
  },
};

const purple = {
  count: 6, length: 38, width: 13,
  light: "#d9c3fc", mid: "#a17cdb", dark: "#724cab", center: "#d9963f", pollen: "#fff3bd",
};

function drawLeaf(ctx, x, y, direction, lift) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  const color = ctx.createLinearGradient(0, 2, 12, -lift);
  color.addColorStop(0, "#43823a");
  color.addColorStop(1, "#8ec251");
  ctx.fillStyle = color;
  ctx.strokeStyle = "#518839";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(4, -12, 16, -lift + 1, 27, -lift);
  ctx.bezierCurveTo(24, -5, 13, 3, 0, 0);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#b1d374";
  ctx.beginPath();
  ctx.moveTo(4, -1);
  ctx.quadraticCurveTo(15, -7, 22, -lift + 3);
  ctx.stroke();
  ctx.restore();
}

function drawStem(ctx) {
  ctx.lineCap = "round";
  ctx.strokeStyle = "#376c35";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(61, 139);
  ctx.quadraticCurveTo(71, 112, 63, 60);
  ctx.stroke();
  ctx.strokeStyle = "#78a84c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 137);
  ctx.quadraticCurveTo(69, 108, 62, 64);
  ctx.stroke();
  drawLeaf(ctx, 65, 124, -1, 21);
  drawLeaf(ctx, 66, 113, 1, 20);
}

function drawPetal(ctx, type, index) {
  const width = type.width * (1 + .065 * Math.sin(index * 3));
  const length = type.length * (1 + .07 * Math.cos(index * 2));
  const gradient = ctx.createLinearGradient(0, -length, 0, 3);
  gradient.addColorStop(0, type.light);
  gradient.addColorStop(.54, type.mid);
  gradient.addColorStop(1, type.dark);
  ctx.save();
  ctx.rotate(Math.PI * 2 * index / type.count + .11);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = type.dark;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.bezierCurveTo(-width * 1.08, -9, -width * 1.32, -length * .64, -width * .82, -length * .85);
  ctx.bezierCurveTo(-width * .52, -length * 1.08, width * .67, -length * 1.13, width, -length * .79);
  ctx.bezierCurveTo(width * 1.24, -length * .51, width * .83, -8, 3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff5";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-width * .39, -length * .78);
  ctx.quadraticCurveTo(-width * .58, -length * .6, -width * .27, -length * .43);
  ctx.stroke();
  ctx.restore();
}

function drawBlossom(ctx, type, centerX, centerY) {
  ctx.save();
  ctx.translate(centerX, centerY);
  for (let i = 0; i < type.count; i++) drawPetal(ctx, type, i);

  const gradient = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
  gradient.addColorStop(0, type.pollen);
  gradient.addColorStop(.35, type.center);
  gradient.addColorStop(1, type.dark);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, type.count === 5 ? 11 : 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = type.pollen;
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    const radius = 3 + (i % 4) * 1.65;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function flowerImage(type, withStem) {
  const canvas = document.createElement("canvas");
  canvas.width = withStem ? 128 : 88;
  canvas.height = withStem ? 146 : 88;
  const ctx = canvas.getContext("2d");
  if (withStem) drawStem(ctx);
  drawBlossom(ctx, type, withStem ? 64 : 44, withStem ? 48 : 44);
  return canvas.toDataURL();
}

export const logoFlower = flowerImage(purple, false);
export const flowerImages = Object.fromEntries(Object.entries(flowerTypes).map(([color, type]) => [
  color,
  { blossom: flowerImage(type, false), whole: flowerImage(type, true) },
]));
