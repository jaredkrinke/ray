declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// Ray-casting and movement algorithms adapted from: https://lodev.org/cgtutor/raycasting.html

const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 2, 2, 1, 1, 1, 0, 0, 0, 1],
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

const textures: ImageData[] = [];

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

class Game extends React.Component {
    private canvas = React.createRef<HTMLCanvasElement>();
    private timer: number | null = null;
    private rc: CanvasRenderingContext2D;
    private screenImage: ImageData;
    private screen: Uint8ClampedArray;

    private player = new Player(3, 3, -1, 0, 3 / fps, 0);
    private sprites: Sprite[] = [
        { x: 4, y: 4, texture: 1 },
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
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                let n = (j * width + i) * bpp;
                this.screen[n++] = 0;
                this.screen[n++] = 0;
                this.screen[n++] = 0;
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
        let n = (y * width + x) * 4;
        let tn = (ty * tw + tx) * 4;
        // TODO: Decide if using real transparency or pink
        this.screen[n++] = td[tn++];
        this.screen[n++] = td[tn++];
        this.screen[n++] = td[tn++];
    }

    private set(x: number, y: number, c: number) {
        const rgb = palette[c];
        let i = 0;
        let n = (y * width + x) * 4;
        this.screen[n++] = rgb[i++];
        this.screen[n++] = rgb[i++];
        this.screen[n++] = rgb[i++];
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

            const texture = textures[(map[my][mx] - 1) * 2 + (ns ? 1 : 0)];
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
        this.sprites.sort((a, b) => (a.distance - b.distance));
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

            const texture = textures[sprite.texture];
            const sptw = texture.width;
            const spth = texture.height;

            for (let i = spx1; i < spx2; i++) {
                const sptx = Math.floor((i - (-spw / 2 + spsx)) * sptw / spw);
                if (trY > 0 && i > 0 && i < width && trY < z[i]) {
                    for (let j = spy1; j < spy2; j++) {
                        const spty = Math.min(spth - 1, Math.round((j - height / 2 + sph / 2) * spth / sph));
                        this.setFromImage(i, j, texture, sptx, spty);
                    }
                }
            }
        }

        this.rc.putImageData(this.screenImage, 0, 0);
    }

    private tick(): void {
        this.update();
        this.draw();
    }

    private keyDown(event: React.KeyboardEvent): void {
        switch (event.key) {
            case "ArrowUp": this.ku = true; break;
            case "ArrowDown": this.kd = true; break;
            case "ArrowLeft": this.kl = true; break;
            case "ArrowRight": this.kr = true; break;
        }
    }

    private keyUp(event: React.KeyboardEvent): void {
        switch (event.key) {
            case "ArrowUp": this.ku = false; break;
            case "ArrowDown": this.kd = false; break;
            case "ArrowLeft": this.kl = false; break;
            case "ArrowRight": this.kr = false; break;
        }
    }

    private createTextures(): void {
        const checker = this.rc.createImageData(32, 32);
        for (let i = 0; i < checker.width; i++) {
            for (let j = 0; j < checker.height; j++) {
                const c = (Math.floor(i / 16) ^ Math.floor(j / 16)) ? Color.white : Color.lightGray;
                this.setInImage(checker, i ,j, c);
            }
        }
        textures.push(checker);

        const checker2 = this.rc.createImageData(32, 32);
        for (let i = 0; i < checker2.width; i++) {
            for (let j = 0; j < checker2.height; j++) {
                const c = (Math.floor(i / 16) ^ Math.floor(j / 16)) ? Color.lightGray : Color.darkGray;
                this.setInImage(checker2, i ,j, c);
            }
        }
        textures.push(checker2);

        const noise = this.rc.createImageData(32, 32);
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                const c = Math.floor(Math.random() * palette.length);
                this.setInImage(noise, i, j, c);
            }
        }
        textures.push(noise);
    }

    public componentWillUnmount(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public componentDidMount(): void {
        this.rc = this.canvas.current.getContext("2d");
        this.screenImage = this.rc.createImageData(width, height);
        this.screen = this.screenImage.data;
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                let n = (j * width + i) * bpp;
                this.screen[n++] = 0;
                this.screen[n++] = 0;
                this.screen[n++] = 0;
                this.screen[n++] = 255;
            }
        }

        this.createTextures();

        this.timer = setInterval(() => this.tick(), 1000 / fps);
    }

    public render() {
        return <canvas ref={this.canvas} tabIndex={1} onKeyDown={(event) => this.keyDown(event)} onKeyUp={(event) => this.keyUp(event)} width={320} height={240}></canvas>;
    }
}

async function loadTexturesAsync(): Promise<void> {
    const textureFiles = [
        "img/wall_lab.png",
        "img/wall_lab2.png",
    ];

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // TODO: Error handling
    const imageDatas = await Promise.all(textureFiles.map(file => (new Promise((resolve: (imageData: ImageData) => void) => {
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
        textures.push(imageData);
    }
}

async function init() {
    await loadTexturesAsync();
    ReactDOM.render(<Game />, document.getElementById("root"));
}

init();
