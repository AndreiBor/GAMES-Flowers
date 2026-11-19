const wideTrail = [[24, 58], [43, 76], [65, 57], [74, 81], [51, 91], [31, 77]];
const phoneTrail = [[27, 65], [45, 86], [67, 62], [79, 82], [57, 94], [28, 87]];

export function groundLayer(y) {
  return Math.floor(y * 100);
}

export class Hedgehog {
  constructor(sprite, mushroomBed) {
    this.sprite = sprite;
    this.mushroomBed = mushroomBed;
    this.position = { x: 0, y: 0 };
  }

  reset(pace, compact) {
    this.pace = pace;
    this.sprite.hidden = !pace;
    this.mushroomBed.replaceChildren();
    if (!pace) return;

    this.trail = (compact ? phoneTrail : wideTrail).map(([x, y]) => ({ x, y }));
    this.position = this.trail[0];
    this.nextStop = 1;
    this.stride = 0;
    this.mushrooms = this.trail.slice(1).map(({ x, y }) => {
      const mushroom = document.createElement("span");
      mushroom.className = "wood-mushroom";
      mushroom.style.left = `${x}%`;
      mushroom.style.top = `${y}%`;
      return mushroom;
    });
    this.mushroomBed.append(...this.mushrooms);
    this.sprite.style.setProperty("--hedgehog-direction", 1);
    this.renderStride();
    this.render();
  }

  advance(seconds, size) {
    const target = this.trail[this.nextStop];
    const dx = (target.x - this.position.x) * size.width / 100;
    const dy = (target.y - this.position.y) * size.height / 100;
    const distance = Math.hypot(dx, dy);
    const step = Math.max(26, size.width * .065) * this.pace * seconds;

    if (distance <= step) {
      this.position = target;
      if (this.nextStop) this.mushrooms[this.nextStop - 1].hidden = true;
      else {
        for (const mushroom of this.mushrooms) mushroom.hidden = false;
      }
      this.nextStop = (this.nextStop + 1) % this.trail.length;
    } else {
      const fraction = step / distance;
      this.position = {
        x: this.position.x + (target.x - this.position.x) * fraction,
        y: this.position.y + (target.y - this.position.y) * fraction,
      };
    }
    if (Math.abs(dx) > .5) this.sprite.style.setProperty("--hedgehog-direction", Math.sign(dx));
    const strideLength = Math.min(28, Math.max(17, size.width * .028));
    this.stride = (this.stride + Math.min(distance, step) / strideLength * 2 * Math.PI) % (2 * Math.PI);
    this.renderStride();
    this.render();
  }

  renderStride() {
    // The planted paws push backward. The rig mirrors this motion when turning.
    const swing = -Math.sin(this.stride);
    const lift = Math.cos(this.stride);
    this.sprite.style.setProperty("--paw-swing", `${swing * 28}deg`);
    this.sprite.style.setProperty("--paw-lift", `${-Math.max(0, lift) * 20}%`);
    this.sprite.style.setProperty("--opposite-paw-lift", `${-Math.max(0, -lift) * 20}%`);
    this.sprite.style.setProperty("--hedgehog-bob", `${-Math.abs(swing) * 1.7}px`);
  }

  render() {
    this.sprite.style.left = `${this.position.x}%`;
    this.sprite.style.top = `${this.position.y}%`;
    this.sprite.style.zIndex = groundLayer(this.position.y);
  }

  crossed(playerBefore, playerAfter, hedgehogBefore, { width, height }) {
    // Test the relative movement over the whole frame, including fast crossings.
    const x = (playerBefore.x - hedgehogBefore.x) * width / 100;
    const y = (playerBefore.y - hedgehogBefore.y) * height / 100;
    const dx = (playerAfter.x - this.position.x) * width / 100 - x;
    const dy = (playerAfter.y - this.position.y) * height / 100 - y;
    const lengthSquared = dx * dx + dy * dy;
    const closest = lengthSquared ? Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared)) : 0;
    const radius = Math.min(26, Math.max(17, width * .03));
    return Math.hypot(x + closest * dx, y + closest * dy) <= radius;
  }
}
