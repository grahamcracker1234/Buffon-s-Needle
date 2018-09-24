function loadedPage() {
    window.canvasID = $("#canvas")[0];
    canvasID.width = window.innerWidth;
    canvasID.height = window.innerHeight;
    window.canvas = canvasID.getContext("2d");
    window.buffon = new Buffon(canvas)
}

function resizeCanvas() {
    canvasID.width = window.innerWidth;
    canvasID.height = window.innerHeight;
}

function Vector3D() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
}

function Vector2D() {
    this.x = 0;
    this.y = 0;
}

function rotationX(theta) {
    let matrix = math.matrix([
        [1, 0, 0],
        [0, Math.cos(theta), -Math.sin(theta)],
        [0, Math.sin(theta), Math.cos(theta)]
    ]);
    return matrix;
};

function rotationY(theta) {
    let matrix = math.matrix([
        [Math.cos(theta), 0, Math.sin(theta)],
        [0, 1, 0],
        [-Math.sin(theta), 0, Math.cos(theta)]
    ]);
    return matrix;
};

function rotationZ(theta) {
    let matrix = math.matrix([
        [Math.cos(theta), -Math.sin(theta), 0],
        [Math.sin(theta), Math.cos(theta), 0],
        [0, 0, 1]
    ]);
    return matrix;
};

function convertMatrixToPoint(matrix) {
    let a = new Vector2D();
    switch (matrix._size[0]) {
        case 3:
            a.z = matrix._data[2][0];
        case 2:
            a.y = matrix._data[1][0];
        case 1:
            a.x = matrix._data[0][0];
    }
    return a;
}

function convertPointToMatrix(point) {
    let a = math.matrix([
        [point.x],
        [point.y],
        [point.z]
    ]);
    return a;
}

function remap(value, l1, h1, l2, h2) {
    return l2 + (h2 - l2) * (value - l1) / (h1 - l1);
}

window.onmousemove = function(event) {
    window.mouseX = event.clientX;
    window.mouseY = event.clientY;
}

function calculatePI() {
    return (2 * window.NEEDLE_LENGTH * window.numDropped) / (window.numCrossed * window.NEEDLE_LENGTH * 2);
}

$(".menu-inputs").keypress(function(event) {
    if (event.keyCode == 13 || event.which == 13) {
        event.preventDefault();
        submitForm();
    }
});

function submitForm() {
    let value = $(".menu-inputs")[0].value;
    if(!isNaN(value)) {
        window.buffon.dropNeedles(value);
    }
}

function updateResults() {
    $("#results").html(Number.parseFloat(calculatePI()).toFixed(10));
    $("#total-needles").html(window.numDropped);
    $("#crossed-needles").html(window.numCrossed);
    $("#percent-error").html(Number.parseFloat(100 * (Math.abs(Math.PI - calculatePI()) / Math.PI)).toFixed(10));
}

function Buffon() {
    window.NEEDLE_LENGTH = 1.0;
    const MILLISECONDS_PER_UPDATE = 5;
    const NUM_FLOOR_LINES = 5.0;
    const MAX_NEEDLES = 10000;
    const MAX_NEEDLE_AGE = 300;
    const FLOOR_FRICTION = 0.2;
    const FLOOR_SIZE = NEEDLE_LENGTH * (NUM_FLOOR_LINES + 1) * 2;
    const FLOOR_LEVEL = 0.0;
    const DROP_HEIGHT = 20;
    const DROP_JITTER = 0.15;
    const DROP_RANGE = FLOOR_SIZE * 0.5;
    const AIR_FRICTION = 0.02;
    const GRAVITY = 0.008;
    const BOUNCE = 0.9;
    const RELAXATION = 0.8;
    const SPRING_FORCE = 0.7;
    const VIEW_PERSPECTIVE = 0.03;
    const VIEW_UP = 0.0;
    const VIEW_Y_SHIFT = 0;
    const START_FALL_RATE = 200;
    const FLOOR_RED = 130;
    const FLOOR_GREEN = 145;
    const FLOOR_BLUE = 175;
    const SHADOW_SHIFT = 30;
    const SHADOW_RED = FLOOR_RED - SHADOW_SHIFT;
    const SHADOW_GREEN = FLOOR_GREEN - SHADOW_SHIFT;
    const SHADOW_BLUE = FLOOR_BLUE - SHADOW_SHIFT;
    const SHADOW_MAX_HEIGHT = 12.0;
    const CROSSING_COLOR = "rgb( 40,  200,  20 )";
    const NEEDLE_COLOR = "rgb(  40,  80, 100 )";
    const FLOOR_COLOR = "rgb( " + FLOOR_RED + ", " + FLOOR_GREEN + ", " + FLOOR_BLUE + " )";
    const SHADOW_COLOR = "rgb( " + SHADOW_RED + ", " + SHADOW_GREEN + ", " + SHADOW_BLUE + " )";

    let dropClock = 0;
    let currentNeedle = 0;
    window.numDropped = 0;
    window.numCrossed = 0;
    let fallRate = START_FALL_RATE;
    let needles = new Array(MAX_NEEDLES);
    let floor = new Floor();

    function Floor() {
        this.leftBack = new Vector3D();
        this.rightBack = new Vector3D();
        this.leftFront = new Vector3D();
        this.rightFront = new Vector3D();
        this.lineBack = new Array(NUM_FLOOR_LINES);
        this.lineFront = new Array(NUM_FLOOR_LINES);
        this.lb = new Array(NUM_FLOOR_LINES);
        this.lf = new Array(NUM_FLOOR_LINES);
    }

    function Needle() {
        this.point1 = new Vector3D();
        this.point2 = new Vector3D();
        this.velocity1 = new Vector3D();
        this.velocity2 = new Vector3D();
        this.falling = false;
        this.active = false;
        this.crossing = false;
        this.age = 0;
    }

    this.dropNeedles = function(amount) {
        for(let i = 0; i < amount; i++) {
            this.dropNeedle(currentNeedle);
            currentNeedle++;
        }
    }

    this.project = function(position) {
        let positionMatrix = convertPointToMatrix(position);

        let mouseXRadians = remap(window.mouseX, 0, window.canvas.canvas.width, 0, 2 * Math.PI)
        let mouseYRadians = remap(window.mouseY, 0, window.canvas.canvas.height, 0, 2 * Math.PI)

        let rotationXMatrix = rotationX(-Math.PI / 4);

        let rotationYMatrix = rotationY(mouseXRadians);
        let rotationZMatrix = rotationZ(0);

        let rotationPosition = convertMatrixToPoint(math.multiply(rotationYMatrix, positionMatrix));
        rotationPosition = convertMatrixToPoint(math.multiply(rotationXMatrix, convertPointToMatrix(rotationPosition)));
        // rotationPosition = convertMatrixToPoint(math.multiply(rotationZMatrix, rotationPosition));

        let scale = (window.canvas.canvas.height / 17.5) / (1.0 + rotationPosition.z * VIEW_PERSPECTIVE);
        let projectedPoint = new Vector2D();

        projectedPoint.x = window.canvas.canvas.width / 2 + rotationPosition.x * scale;
        projectedPoint.y = window.canvas.canvas.height / 2 + (-rotationPosition.y) * scale;

        return projectedPoint;
    };

    this.update = function() {
        dropClock++;

        if (dropClock % Math.floor(fallRate) == 0) {
            if (currentNeedle < MAX_NEEDLES) {
                dropClock = 0;
                this.dropNeedles(1);
            }
        }

        this.updateNeedle();
        this.updateFloor();
        this.render();
        this.timer = setTimeout("buffon.update()", MILLISECONDS_PER_UPDATE);
    };

    this.render = function() {
        canvas.fillStyle = SHADOW_COLOR;
        canvas.fillRect(0, 0, window.canvas.canvas.width, window.canvas.canvas.height);

        this.drawFloor();
        this.drawNeedles();
    };

    this.updateNeedle = function() {
        updateResults();
        for (let n = 0; n < MAX_NEEDLES; n++) {
            if (needles[n].falling) {
                this.updateNeedlePhysics(n);

                if (needles[n].age > MAX_NEEDLE_AGE) {

                    needles[n].falling = false;

                    numDropped++;

                    needles[n].crossing = this.caculateCrossing(n);

                    if (needles[n].crossing) {
                        numCrossed++;
                    }
                }
            }
        }
    }

    this.updateNeedlePhysics = function(n) {
        needles[n].age++;

        let xx = needles[n].point2.x - needles[n].point1.x;
        let yy = needles[n].point2.y - needles[n].point1.y;
        let zz = needles[n].point2.z - needles[n].point1.z;
        let length = Math.sqrt(xx * xx + yy * yy + zz * zz);

        let normX = NEEDLE_LENGTH;
        let normY = 0.0;
        let normZ = 0.0;

        if (length > 0.0) {
            normX = xx / length;
            normY = yy / length;
            normZ = zz / length;
        }

        let diff = NEEDLE_LENGTH - length;
        let forceX = diff * normX * SPRING_FORCE;
        let forceY = diff * normY * SPRING_FORCE;
        let forceZ = diff * normZ * SPRING_FORCE;

        needles[n].velocity1.x -= forceX;
        needles[n].velocity1.y -= forceY;
        needles[n].velocity1.z -= forceZ;

        needles[n].velocity2.x += forceX;
        needles[n].velocity2.y += forceY;
        needles[n].velocity2.z += forceZ;

        needles[n].point1.x -= forceX * (1.0 - RELAXATION);
        needles[n].point1.y -= forceY * (1.0 - RELAXATION);
        needles[n].point1.z -= forceZ * (1.0 - RELAXATION);

        needles[n].point2.x += forceX * (1.0 - RELAXATION);
        needles[n].point2.y += forceY * (1.0 - RELAXATION);
        needles[n].point2.z += forceZ * (1.0 - RELAXATION);

        needles[n].velocity1.y -= GRAVITY;
        needles[n].velocity2.y -= GRAVITY;

        needles[n].velocity1.y *= 1.0 - AIR_FRICTION;
        needles[n].velocity2.y *= 1.0 - AIR_FRICTION;

        needles[n].point1.x += needles[n].velocity1.x;
        needles[n].point1.y += needles[n].velocity1.y;
        needles[n].point1.z += needles[n].velocity1.z;

        needles[n].point2.x += needles[n].velocity2.x;
        needles[n].point2.y += needles[n].velocity2.y;
        needles[n].point2.z += needles[n].velocity2.z;

        if (needles[n].point1.y < FLOOR_LEVEL) {
            needles[n].point1.y = FLOOR_LEVEL;

            needles[n].velocity1.x *= 1.0 - FLOOR_FRICTION;
            needles[n].velocity1.z *= 1.0 - FLOOR_FRICTION;

            if (needles[n].velocity1.y < 0.0) {
                needles[n].velocity1.y *= -BOUNCE * Math.random();
            }
        }

        if (needles[n].point2.y < FLOOR_LEVEL) {
            needles[n].point2.y = FLOOR_LEVEL;

            needles[n].velocity2.x *= 1.0 - FLOOR_FRICTION;
            needles[n].velocity2.z *= 1.0 - FLOOR_FRICTION;

            if (needles[n].velocity2.y < 0.0) {
                needles[n].velocity2.y *= -BOUNCE * Math.random();;
            }
        }
    };

    this.dropNeedle = function(n) {
        needles[n].falling = true;
        needles[n].active = true;

        let startX = -DROP_RANGE / 2 + DROP_RANGE * Math.random();
        let startZ = -DROP_RANGE / 2 + DROP_RANGE * Math.random();
        let startY = DROP_HEIGHT;

        let angle = Math.random();
        let rad = angle * Math.PI * 2.0;

        let vx = Math.sin(rad);
        let vz = Math.cos(rad);
        let vy = -1.0 + 2.0 * Math.random();

        let length = Math.sqrt(vx * vx + vy * vy + vz * vz);

        let directionX = 0.0;
        let directionY = 1.0;
        let directionZ = 0.0;

        if (length > 0.0) {
            directionX = vx / length;
            directionY = vy / length;
            directionZ = vz / length;
        }

        needles[n].point1.x = startX - directionX / 2 * NEEDLE_LENGTH;
        needles[n].point1.y = startY - directionY / 2 * NEEDLE_LENGTH;
        needles[n].point1.z = startZ - directionZ / 2 * NEEDLE_LENGTH;

        needles[n].point2.x = startX + directionX / 2 * NEEDLE_LENGTH;
        needles[n].point2.y = startY + directionY / 2 * NEEDLE_LENGTH;
        needles[n].point2.z = startZ + directionZ / 2 * NEEDLE_LENGTH;

        needles[n].velocity1.x = 0.0;
        needles[n].velocity1.y = 0.0;
        needles[n].velocity1.z = 0.0;
        needles[n].velocity2.x = 0.0;
        needles[n].velocity2.y = 0.0;
        needles[n].velocity2.z = 0.0;
    };

    this.drawNeedles = function() {
        //shadows
        canvas.lineWidth = 3;
        for (let n = 0; n < MAX_NEEDLES; n++) {
            if (needles[n].falling) {
                let minHeight = FLOOR_LEVEL;
                let maxHeight = FLOOR_LEVEL + SHADOW_MAX_HEIGHT;
                if (needles[n].point1.y < maxHeight) {
                    let point1Shadow = new Vector3D();
                    let point2Shadow = new Vector3D();

                    point1Shadow.x = needles[n].point1.x;
                    point1Shadow.y = FLOOR_LEVEL;
                    point1Shadow.z = needles[n].point1.z;

                    point2Shadow.x = needles[n].point2.x;
                    point2Shadow.y = FLOOR_LEVEL;
                    point2Shadow.z = needles[n].point2.z;

                    let s1 = this.project(point1Shadow);
                    let s2 = this.project(point2Shadow);

                    let f = (needles[n].point1.y - minHeight) / (maxHeight - minHeight);

                    let red = Math.floor(SHADOW_RED + (FLOOR_RED - SHADOW_RED) * f);
                    let green = Math.floor(
                        SHADOW_GREEN + (FLOOR_GREEN - SHADOW_GREEN) * f
                    );
                    let blue = Math.floor(SHADOW_BLUE + (FLOOR_BLUE - SHADOW_BLUE) * f);

                    canvas.strokeStyle =
                        "rgb( " + red + ", " + green + ", " + blue + " )";

                    canvas.beginPath();
                    canvas.moveTo(s1.x, s1.y);
                    canvas.lineTo(s2.x, s2.y);
                    canvas.stroke();
                    canvas.closePath();
                }
            }
        }
        //needles
        canvas.lineWidth = 2;
        for (let n = 0; n < MAX_NEEDLES; n++) {
            if (needles[n].active) {
                let point1 = this.project(needles[n].point1);
                let point2 = this.project(needles[n].point2);

                if (needles[n].crossing) {
                    canvas.strokeStyle = CROSSING_COLOR;
                } else {
                    canvas.strokeStyle = NEEDLE_COLOR;
                }
                canvas.beginPath();
                canvas.moveTo(point1.x, point1.y);
                canvas.lineTo(point2.x, point2.y);
                canvas.stroke();
                canvas.closePath();
            }
        }

    };

    this.updateFloor = function() {
        let h = FLOOR_SIZE / 2;
        floor.leftBack.x = -h;
        floor.leftBack.y = FLOOR_LEVEL;
        floor.leftBack.z = -h;

        floor.rightBack.x = h;
        floor.rightBack.y = FLOOR_LEVEL;
        floor.rightBack.z = -h;

        floor.leftFront.x = -h;
        floor.leftFront.y = FLOOR_LEVEL;
        floor.leftFront.z = h;

        floor.rightFront.x = h;
        floor.rightFront.y = FLOOR_LEVEL;
        floor.rightFront.z = h;

        floor.f0 = this.project(floor.leftBack);
        floor.f1 = this.project(floor.rightBack);
        floor.f2 = this.project(floor.rightFront);
        floor.f3 = this.project(floor.leftFront);

        let width = NEEDLE_LENGTH * 2.0;

        for (let l = 0; l < NUM_FLOOR_LINES; l++) {
            floor.lineBack[l] = new Vector3D();
            floor.lineFront[l] = new Vector3D();

            floor.lineBack[l].x = -h + width * (1 + l);
            floor.lineBack[l].y = FLOOR_LEVEL;
            floor.lineBack[l].z = -h;

            floor.lineFront[l].x = -h + width * (1 + l);
            floor.lineFront[l].y = FLOOR_LEVEL;
            floor.lineFront[l].z = h;

            floor.lb[l] = this.project(floor.lineBack[l]);
            floor.lf[l] = this.project(floor.lineFront[l]);
        }
    }

    this.initializeFloor = function() {
        let h = FLOOR_SIZE / 2;
        floor.leftBack.x = -h;
        floor.leftBack.y = FLOOR_LEVEL;
        floor.leftBack.z = -h;

        floor.rightBack.x = h;
        floor.rightBack.y = FLOOR_LEVEL;
        floor.rightBack.z = -h;

        floor.leftFront.x = -h;
        floor.leftFront.y = FLOOR_LEVEL;
        floor.leftFront.z = h;

        floor.rightFront.x = h;
        floor.rightFront.y = FLOOR_LEVEL;
        floor.rightFront.z = h;

        floor.f0 = this.project(floor.leftBack);
        floor.f1 = this.project(floor.rightBack);
        floor.f2 = this.project(floor.rightFront);
        floor.f3 = this.project(floor.leftFront);

        let width = NEEDLE_LENGTH * 2.0;

        for (let l = 0; l < NUM_FLOOR_LINES; l++) {
            floor.lineBack[l] = new Vector3D();
            floor.lineFront[l] = new Vector3D();

            floor.lineBack[l].x = -h + width * (1 + l);
            floor.lineBack[l].y = FLOOR_LEVEL;
            floor.lineBack[l].z = -h;

            floor.lineFront[l].x = -h + width * (1 + l);
            floor.lineFront[l].y = FLOOR_LEVEL;
            floor.lineFront[l].z = h;

            floor.lb[l] = this.project(floor.lineBack[l]);
            floor.lf[l] = this.project(floor.lineFront[l]);
        }
    };

    this.drawFloor = function() {
        canvas.fillStyle = FLOOR_COLOR;
        canvas.beginPath();
        canvas.moveTo(floor.f0.x, floor.f0.y);
        canvas.lineTo(floor.f1.x, floor.f1.y);
        canvas.lineTo(floor.f2.x, floor.f2.y);
        canvas.lineTo(floor.f3.x, floor.f3.y);
        canvas.closePath();
        canvas.fill();
        //Floor Lines
        canvas.lineWidth = 1;
        canvas.strokeStyle = "rgb( 60, 60, 60 )";
        canvas.beginPath();
        canvas.moveTo(floor.f0.x, floor.f0.y);
        canvas.lineTo(floor.f1.x, floor.f1.y);
        canvas.lineTo(floor.f2.x, floor.f2.y);
        canvas.lineTo(floor.f3.x, floor.f3.y);
        canvas.lineTo(floor.f0.x, floor.f0.y);
        canvas.stroke();
        canvas.closePath();

        for (let l = 0; l < NUM_FLOOR_LINES; l++) {
            canvas.beginPath();
            canvas.moveTo(floor.lb[l].x, floor.lb[l].y);
            canvas.lineTo(floor.lf[l].x, floor.lf[l].y);
            canvas.stroke();
            canvas.closePath();
        }
    };

    this.caculateCrossing = function(n) {
        let crossing = false;

        for (let l = 0; l < NUM_FLOOR_LINES; l++) {
            if (
                needles[n].point1.x < floor.lineBack[l].x &&
                needles[n].point2.x > floor.lineBack[l].x
            ) {
                return true;
            }

            if (
                needles[n].point2.x < floor.lineBack[l].x &&
                needles[n].point1.x > floor.lineBack[l].x
            ) {
                return true;
            }
        }

        return false;
    };

    this.initialize = function() {
        for (let n = 0; n < MAX_NEEDLES; n++) {
            needles[n] = new Needle();
        }
        this.initializeFloor();
        this.timer = setTimeout("buffon.update()", MILLISECONDS_PER_UPDATE);
    }

    this.initialize();
}
