const eps = 1e-3;
const gridrows = 10;
const gridcols = 10;

class vec2 {
  x: number;
  y: number;

  constructor(x:number, y:number) {
    this.x = x;
    this.y = y;
  }
  add(that: vec2): vec2 {
    return new vec2(this.x+that.x, this.y+that.y);
  }
  sub(that: vec2): vec2 {
    return new vec2(this.x-that.x, this.y-that.y);
  }
  div(that: vec2): vec2 {
    return new vec2(this.x/that.x, this.y/that.y);
  }
  mul(that: vec2):vec2 {
    return new vec2(that.x*this.x, that.y*this.y);
  }
  length(): number {
    return Math.sqrt(this.x*this.x + this.y*this.y)
  }
  norm(): vec2 {
    const one = this.length();
    if (one == 0) return new vec2(0,0);
    return new vec2(this.x/one, this.y/one);
  }
  scale(value: number): vec2 {
    return new vec2(this.x*value, this.y*value)
  }
  distanceto(that:vec2) {
    return that.sub(this).length();
  }
  array(): [number, number] {
    return [this.x, this.y];
  }
}

const gridsize = new vec2(gridcols, gridrows);
const scene = Array(gridrows).fill(0).map(() => Array(gridcols).fill(0));

function fillcircle(ctx: CanvasRenderingContext2D, center: vec2, radius: number) {
  ctx.fillStyle = "purple"
  ctx.beginPath();
  ctx.arc(...center.array(), radius, 0, 2*Math.PI)
  ctx.fill();
}

function strokeline(ctx: CanvasRenderingContext2D, p1: vec2, p2: vec2) {
    ctx.beginPath();
    ctx.moveTo(...p1.array());
    ctx.lineTo(...p2.array());
    ctx.stroke();
}

function snap(x: number, dx:number): number {
  if (dx > 0) return Math.ceil(x + Math.sign(dx)*eps);
  if (dx < 0) return Math.floor(x + Math.sign(dx)*eps );
  return x;
}

function hitcell(p1: vec2, p2: vec2): vec2 {
  const d = p2.sub(p1);
  return new vec2(Math.floor(p2.x + Math.sign(d.x)*eps),
                  Math.floor(p2.y + Math.sign(d.y)*eps));
}

function raystep(p1: vec2, p2: vec2): vec2 {

  const d = p2.sub(p1);
  let p3 = p2
  if (d.x != 0) {
    const k = d.y/d.x;
    const c = p1.y - k*p1.x;
    {
      const x3 = snap(p2.x, d.x);
      const y3 = x3 * k + c;
      p3 = new vec2(x3,y3);
    }

    if (k !== 0) {
      const y3 = snap(p2.y, d.y);
      const x3 = (y3 - c)/k;
      let p3t = new vec2(x3,y3)
      if (p2.distanceto(p3t) < p2.distanceto(p3)) {
        p3 = p3t;
      }
    }
  } else {
      const y3 = snap(p2.y, d.y);
      const x3 = p2.x
      p3 = new vec2(x3, y3);
  }

  return p3;
}

function canvassize(ctx: CanvasRenderingContext2D): vec2 {
  return new vec2(ctx.canvas.width, ctx.canvas.height);
}

function grid(ctx: CanvasRenderingContext2D, p2: vec2 | undefined) {
  ctx.reset();

  ctx.fillStyle = "#181818"
  ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);

  ctx.scale(ctx.canvas.width/gridcols,ctx.canvas.height/gridrows);
  ctx.lineWidth = 0.01;

  for (let y = 0; y < gridrows; y++) {
    for(let x = 0; x < gridcols; x++) {
      if (scene[y][x] !== 0) {
        ctx.fillStyle = "#303030"
        ctx.fillRect(x,y,1,1);
      }
    }
  }

  ctx.strokeStyle = "#303030"
  for (let i = 0; i <= gridcols; i++){
    strokeline(ctx, new vec2(i,0), new vec2(i,gridrows))
  }
  for (let i = 0; i <= gridrows; i++){
    strokeline(ctx, new vec2(0,i), new vec2(gridcols, i))
  }

  let p1 = new vec2(gridcols*0.5, gridrows*0.5);
  ctx.fillStyle = "purple"
  fillcircle(ctx, p1, 0.2)
  if (p2 !== undefined) {
    for (;;) {
      fillcircle(ctx, p2, 0.2)
      ctx.strokeStyle = "magenta"
      strokeline(ctx, p1, p2)

      const c: vec2 = hitcell(p1,p2);
      if (c.x < 0 
        || c.x >= gridsize.x || c.y < 0 
        || c.y >= gridsize.y || scene[c.y][c.x] == 1) break;

      const p3 = raystep(p1, p2)
      p1 = p2;
      p2 = p3;
    }
  }
}

(() => {
  scene[1][1] = 1;
  const game = document.getElementById("game") as (HTMLCanvasElement | null);
  if (game === null ) {
    throw new Error("no game found ");
  }
  game.width = 800;
  game.height = 800;

  const ctx = game.getContext("2d");
  if (ctx === null ) {
    throw new Error("2d ctx is not supported");
  }

  // p2 follows the mouse
  let p2: vec2 | undefined = undefined
  game.addEventListener("mousemove", (mouseevent) => {
    p2 = new vec2(mouseevent.offsetX, mouseevent.offsetY)
      .div(canvassize(ctx))
      .mul(new vec2(gridcols, gridrows));
    grid(ctx, p2)
  });
  grid(ctx, p2)

  console.log("hellop");
})()
