declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// Ray-casting and movement algorithms adapted from: https://lodev.org/cgtutor/raycasting.html

const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const width = 320;
const height = 240;

const bpp = 4;
const fps = 15;

enum Color {
    black = 0,
    blue,
    red,
    purple,
    darkGray,
    indigo,
    brown,
    green,
    salmon,
    aqua,
    pink,
    lightGray,
    lime,
    cyan,
    yellow,
    white,
}

const palette = [
    [0, 0, 0],
    [0, 0, 168],
    [168, 0, 0],
    [168, 0, 168],
    [84, 84, 84],
    [84, 84, 254],
    [168, 84, 0],
    [0, 168, 0],
    [254, 84, 84],
    [0, 168, 168],
    [254, 84, 254],
    [168, 168, 168],
    [84, 254, 84],
    [84, 254, 254],
    [254, 254, 84],
    [254, 254, 254],
];

const wallTextures: ImageData[] = [];
const spriteTextures: ImageData[] = [];

class Player {
    private cosRs: number;
    private sinRs: number;
    public px: number;
    public py: number;

    constructor(public x: number, public y: number, public dx: number, public dy: number, public speed: number, public move: number) {
        const rs = Math.PI / fps;
        this.cosRs = Math.cos(rs);
        this.sinRs = Math.sin(rs);
        this.px = 0;
        this.py = 0.66;
    }

    public rotate(left: boolean) {
        const { px, dx, cosRs } = this;
        const sinRs = left ? this.sinRs : -this.sinRs;

        this.dx = this.dx * cosRs - this.dy * sinRs;
        this.dy = dx * sinRs + this.dy * cosRs;
        this.px = this.px * cosRs - this.py * sinRs;
        this.py = px * sinRs + this.py * cosRs;
    }
}

interface Sprite {
    x: number;
    y: number;
    texture: number;
    distance?: number;
}

class Game extends React.Component<{ scale: number }> {
    private canvas = React.createRef<HTMLCanvasElement>();
    private timer: number | null = null;
    private rc: CanvasRenderingContext2D;
    private screenImage: ImageData;
    private scaledScreenImage: ImageData;
    private screen: Uint8ClampedArray;

    private player = new Player(2, 2, -1, 0, 3 / fps, 0);
    private sprites: Sprite[] = [
        { x: 3, y: 3, texture: 0 },
        { x: 3, y: 4, texture: 1 },
    ];

    // Input
    private ku = false;
    private kd = false;
    private kl = false;
    private kr = false;

    private update(): void {
        if (this.kl || this.kr) {
            this.player.rotate(this.kl);
        }

        if (this.ku || this.kd) {
            // TODO: Move into Entity
            const { x, y, dx, dy, speed } = this.player;
            const distance = this.ku ? speed : -speed;
            if (map[Math.floor(y)][Math.floor(x + dx * distance)] === 0) {
                this.player.x += dx * distance;
            }
            if (map[Math.floor(y + dy * distance)][Math.floor(x)] === 0) {
                this.player.y += dy * distance;
            }
        }
    }

    private clear(): void {
        const rgb = palette[Color.darkGray];
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                let n = (j * width + i) * bpp;
                let b = 0;
                this.screen[n++] = rgb[b++];
                this.screen[n++] = rgb[b++];
                this.screen[n++] = rgb[b++];
            }
        }
    }

    private setInImage(image: ImageData, x: number, y: number, c: number): void {
        const rgb = palette[c];
        let i = 0;
        let n = (y * image.width + x) * 4;
        image.data[n++] = rgb[i++];
        image.data[n++] = rgb[i++];
        image.data[n++] = rgb[i++];
    }

    private setFromImage(x: number, y: number, texture: ImageData, tx: number, ty: number) {
        const tw = texture.width;
        const td = texture.data;
        let tn = (ty * tw + tx) * 4;
        // TODO: Decide if using real transparency or pink
        if (td[tn + 3] !== 0) {
            let n = (y * width + x) * 4;
            this.screen[n++] = td[tn++];
            this.screen[n++] = td[tn++];
            this.screen[n++] = td[tn++];
        }
    }

    private set(x: number, y: number, c: number) {
        const rgb = palette[c];
        let i = 0;
        let n = (y * width + x) * 4;
        this.screen[n++] = rgb[i++];
        this.screen[n++] = rgb[i++];
        this.screen[n++] = rgb[i++];
    }

    private scaleAndPaint() {
        const scaled = this.scaledScreenImage;
        const scaledData = scaled.data;
        const screen = this.screen;
        const scale = this.props.scale;
        let scaledIndex = 0;
        let screenIndex = 0;
        for (let i = 0; i < height; i++) {
            const lineStart = scaledIndex;
            for (let j = 0; j < width; j++) {
                for (let s = 0; s < scale; s++) {
                    scaledData[scaledIndex++] = screen[screenIndex];
                    scaledData[scaledIndex++] = screen[screenIndex + 1];
                    scaledData[scaledIndex++] = screen[screenIndex + 2];
                    scaledIndex++;
                }
                screenIndex += 4;
            }

            for (let s = 1; s < scale; s++) {
                const end = scaledIndex + scaled.width * 4;
                scaledData.copyWithin(scaledIndex, lineStart, end);
                scaledIndex = end;
            }
        }

        this.rc.putImageData(scaled, 0, 0);
    }

    private draw(): void {
        this.clear();

        // Walls (and z-buffer)
        const { x, y, dx, dy, px, py } = this.player;
        const z: number[] = [];
        for (let column = 0; column < width; column++) {
            const cx = 2 * column / width - 1;
            const rx = dx + px * cx;
            const ry = dy + py * cx;

            let mx = Math.floor(x);
            let my = Math.floor(y);

            let sdx: number;
            let sdy: number;

            let ddx = Math.abs(1 / rx);
            let ddy = Math.abs(1 / ry);
            let sx: number;
            let sy: number;
            let wall = 0;
            let ns = true;

            if (rx < 0) {
                sx = -1;
                sdx = (x - mx) * ddx;
            } else {
                sx = 1;
                sdx = (mx + 1 - x) * ddx;
            }

            if (ry < 0) {
                sy = -1;
                sdy = (y - my) * ddy;
            } else {
                sy = 1;
                sdy = (my + 1 - y) * ddy;
            }

            while (wall === 0) {
                if (sdx < sdy) {
                    sdx += ddx;
                    mx += sx;
                    ns = false;
                } else {
                    sdy += ddy;
                    my += sy;
                    ns = true;
                }

                wall = map[my][mx];
            }

            let pwd: number;
            if (ns) {
                pwd = (my - y + (1 - sy) / 2) / ry;
            } else {
                pwd = (mx - x + (1 - sx) / 2) / rx;
            }

            let lh = Math.floor(height / pwd);
            const y1 = Math.max(0, Math.floor(-lh / 2 + height / 2));
            const y2 = Math.min(height - 1, Math.floor(lh / 2 + height / 2))

            const texture = wallTextures[(map[my][mx] - 1) * 2 + (ns ? 1 : 0)];
            let wx = ns ? (x + pwd * rx) : (y + pwd * ry);
            wx -= Math.floor(wx);

            const tw = texture.width;
            let tx = Math.floor(wx * tw);
            if ((ns && ry < 0) || (!ns && rx > 0)) {
                tx = tw - tx - 1;
            }

            const th = texture.height;
            const step = th / lh;
            let tp = (y1 - height / 2 + lh / 2) * step;
            for (let i = y1; i < y2; i++) {
                const ty = Math.min(th - 1, Math.round(tp));
                tp += step;
                this.setFromImage(column, i, texture, tx, ty);
            }

            z.push(pwd);
        }

        // Sprites
        this.sprites.forEach(s => { s.distance = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y); })
        this.sprites.sort((a, b) => (b.distance - a.distance));
        for (const sprite of this.sprites) {
            const spx = sprite.x - x;
            const spy = sprite.y - y;
            const d = 1 / (px * dy - dx * py);
            const trx = d * (dy * spx - dx * spy);
            const trY = d * (-py * spx + px * spy);
            const spsx = Math.floor(width / 2 * (1 + trx / trY));

            const sph = Math.abs(Math.floor(height / trY));
            const spy1 = Math.max(0, Math.floor(-sph / 2 + height / 2));
            const spy2 = Math.min(height - 1, Math.floor(sph / 2 + height / 2));

            const spw = Math.abs(Math.floor(height / trY));
            const spx1 = Math.max(0, Math.floor(-spw / 2 + spsx));
            const spx2 = Math.min(width - 1, Math.floor(spw / 2 + spsx));

            const texture = spriteTextures[sprite.texture];
            const sptw = texture.width;
            const spth = texture.height;

            for (let i = spx1; i < spx2; i++) {
                const sptx = Math.max(0, Math.floor((i - (-spw / 2 + spsx)) * sptw / spw));
                if (trY > 0 && i > 0 && i < width && trY < z[i]) {
                    for (let j = spy1; j < spy2; j++) {
                        const spty = Math.min(spth - 1, Math.round((j - height / 2 + sph / 2) * spth / sph));
                        this.setFromImage(i, j, texture, sptx, spty);
                    }
                }
            }
        }

        this.scaleAndPaint();
    }

    private tick(): void {
        this.update();
        this.draw();
    }

    private keyDown(event: React.KeyboardEvent): void {
        switch (event.key) {
            case "ArrowUp": this.ku = true; event.preventDefault(); break;
            case "ArrowDown": this.kd = true; event.preventDefault(); break;
            case "ArrowLeft": this.kl = true; event.preventDefault(); break;
            case "ArrowRight": this.kr = true; event.preventDefault(); break;
        }
    }

    private keyUp(event: React.KeyboardEvent): void {
        switch (event.key) {
            case "ArrowUp": this.ku = false; event.preventDefault(); break;
            case "ArrowDown": this.kd = false; event.preventDefault(); break;
            case "ArrowLeft": this.kl = false; event.preventDefault(); break;
            case "ArrowRight": this.kr = false; event.preventDefault(); break;
        }
    }

    private clearImageData(image: ImageData): void {
        const data = image.data;
        for (let i = 0; i < image.width; i++) {
            for (let j = 0; j < image.height; j++) {
                let n = (j * image.width + i) * bpp;
                data[n++] = 0;
                data[n++] = 0;
                data[n++] = 0;
                data[n++] = 255;
            }
        }
    }

    public componentWillUnmount(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public componentDidMount(): void {
        const canvas = this.canvas.current;
        this.rc = canvas.getContext("2d");
        this.screenImage = this.rc.createImageData(width, height);
        this.screen = this.screenImage.data;
        this.clearImageData(this.screenImage);

        this.scaledScreenImage = this.rc.createImageData(canvas.width, canvas.height);
        this.clearImageData(this.scaledScreenImage);

        this.timer = setInterval(() => this.tick(), 1000 / fps);
    }

    public render() {
        return <canvas ref={this.canvas} width={width * this.props.scale} height={height * this.props.scale} tabIndex={1} onKeyDown={(event) => this.keyDown(event)} onKeyUp={(event) => this.keyUp(event)}></canvas>;
    }
}

async function loadTexturesIntoArrayAsync(array: ImageData[], files: string[]): Promise<void> {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // TODO: Error handling
    const imageDatas = await Promise.all(files.map(file => (new Promise((resolve: (imageData: ImageData) => void) => {
        const image = new Image();
        image.src = file;
        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            context.drawImage(image, 0, 0);
            resolve(context.getImageData(0, 0, image.width, image.height));
        };
    }))));

    for (const imageData of imageDatas) {
        array.push(imageData);
    }
}

async function loadTexturesAsync(): Promise<void> {
    await Promise.all([
        loadTexturesIntoArrayAsync(wallTextures, [
            "img/wall_lab.png",
            "img/wall_lab2.png",
        ]),
        loadTexturesIntoArrayAsync(spriteTextures, [
            "img/jumper.png",
            "img/zombie.png",
        ]),
    ]);
}

async function init() {
    await loadTexturesAsync();
    ReactDOM.render(<Game scale={3} />, document.getElementById("root"));
}

init();
