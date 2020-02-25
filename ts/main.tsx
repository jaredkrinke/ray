declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// Ray-casting and movement algorithms as described here: https://lodev.org/cgtutor/raycasting.html

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

let width = 320;
let height = 240;

const fps = 10;

class Entity {
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

class Game extends React.Component {
    private canvas = React.createRef<HTMLCanvasElement>();
    private rc: CanvasRenderingContext2D;
    private timer: number | null = null;

    private player = new Entity(3, 3, -1, 0, 3 / fps, 0);

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

    private draw(): void {
        this.rc.fillStyle = "black";
        this.rc.fillRect(0, 0, width, height);

        const { x, y, dx, dy, px, py } = this.player;
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
            let ds = Math.max(0, -lh / 2 + height / 2);
            let de = Math.min(height - 1, lh / 2 + height / 2);

            this.rc.fillStyle = ns ? "lightgray" : "darkgray";
            this.rc.fillRect(column, ds, 1, de - ds + 1);
        }
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

    public componentWillUnmount(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public componentDidMount(): void {
        this.rc = this.canvas.current.getContext("2d");
        this.timer = setInterval(() => this.tick(), 1000 / fps);
    }

    public render() {
        return <canvas ref={this.canvas} tabIndex={1} onKeyDown={(event) => this.keyDown(event)} onKeyUp={(event) => this.keyUp(event)} width={320} height={240}></canvas>;
    }
}

ReactDOM.render(<Game />, document.getElementById("root"));
