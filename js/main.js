// ============================================================
// KLAX AIR TRAFFIC CONTROL
// VERSION 1.0
// ============================================================
// Command                                              Action
// ============================================================
// 123 * 270          |       Turn aircraft 123 to heading 270°
// 123 => 06L/24R     |   Clear aircraft 123 for runway 06L/24R
// 123 ALT 3000       |       Set target altitude to 3,000 feet
// 123 SPD 180        |           Set target speed to 180 knots
// 123 STAT           |               Show aircraft information
// 123 CANCEL         |                      Cancel an approach
// HELP               |                           Show commands
// SCORE              |                 Display game statistics
// LIST               |        List aircraft currently on radar
//                    |
//                    |
// ============================================================
// CANVAS
// ============================================================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);


// ============================================================
// GAME SETTINGS
// ============================================================

const RADAR_INTERVAL = 4800;
const MAX_PLANES = 35;

const INITIAL_PLANES = 8;

const SPAWN_INTERVAL = 15000;

const GAME_SPEED = 1;

const PIXELS_PER_KNOT_SECOND = 0.025;

const MAX_TURN_RATE = 3;

const MIN_SEPARATION = 45;

const COLLISION_DISTANCE = 12;

const ALTITUDE_SEPARATION = 1000;

const LANDING_POINTS = 100;

const COLLISION_PENALTY = 250;

const ESCAPE_PENALTY = 25;

let score = 0;
let landedCount = 0;
let warningCount = 0;
let collisionCount = 0;

let paused = false;

let planes = [];
let landing_planes = [];
let radar_planes = [];

let stat_rotation = 0;

let brightness = 25;

let nextPlaneId = 100;

let lastRadarUpdate = performance.now();

let spawnTimer = 0;
let radarTimer = 0;
let statTimer = 0;

let gameTime = 0;


// ============================================================
// RUNWAYS
// ============================================================

const runways = [
    {
        name: "06L/24R",
        p1: [163, 292],
        p2: [340, 270],
        type: "Arrivals"
    },
    {
        name: "06R/24L",
        p1: [142, 309],
        p2: [358, 282],
        type: "Departures"
    },
    {
        name: "07L/25R",
        p1: [218, 390],
        p2: [474, 359],
        type: "Departures"
    },
    {
        name: "07R/25L",
        p1: [236, 404],
        p2: [456, 377],
        type: "Arrivals"
    }
];


// ============================================================
// RUNWAY APPROACHES
// ============================================================

let runway_approaches = [];

for (const runway of runways) {

    if (runway.type !== "Arrivals") {
        continue;
    }

    const dx = runway.p1[0] - runway.p2[0];
    const dy = runway.p1[1] - runway.p2[1];

    const length = Math.hypot(dx, dy);

    const nx = dx / length;
    const ny = dy / length;

    const finalLength = 1000;

    runway_approaches.push([
        runway.p1[0] + nx * finalLength,
        runway.p1[1] + ny * finalLength
    ]);
}


// ============================================================
// AIRLINES
// ============================================================

const airlines = [
    { code: "AAL", callsign: "AMERICAN" },
    { code: "AAL", callsign: "AMERICAN" },
    { code: "AAL", callsign: "AMERICAN" },
    { code: "AAL", callsign: "AMERICAN" },

    { code: "DAL", callsign: "DELTA" },
    { code: "DAL", callsign: "DELTA" },
    { code: "DAL", callsign: "DELTA" },
    { code: "DAL", callsign: "DELTA" },

    { code: "UAL", callsign: "UNITED" },
    { code: "UAL", callsign: "UNITED" },
    { code: "UAL", callsign: "UNITED" },
    { code: "UAL", callsign: "UNITED" },

    { code: "SWA", callsign: "SOUTHWEST" },
    { code: "SWA", callsign: "SOUTHWEST" },
    { code: "SWA", callsign: "SOUTHWEST" },

    { code: "ASA", callsign: "ALASKA" },
    { code: "ASA", callsign: "ALASKA" },
    { code: "ASA", callsign: "ALASKA" },

    { code: "SKW", callsign: "SKYWEST" },
    { code: "SKW", callsign: "SKYWEST" },
    { code: "SKW", callsign: "SKYWEST" },

    { code: "JBU", callsign: "JETBLUE" },
    { code: "JBU", callsign: "JETBLUE" },

    { code: "FFT", callsign: "FRONTIER" },
    { code: "NKS", callsign: "SPIRIT" },

    { code: "ACA", callsign: "AIR CANADA" },
    { code: "AMX", callsign: "AEROMEXICO" },

    { code: "BAW", callsign: "SPEEDBIRD" },
    { code: "AFR", callsign: "AIR FRANCE" },
    { code: "DLH", callsign: "LUFTHANSA" },

    { code: "KAL", callsign: "KOREAN AIR" },
    { code: "AAR", callsign: "ASIANA" },
    { code: "ANA", callsign: "ALL NIPPON" },
    { code: "JAL", callsign: "JAPAN AIR" },

    { code: "CPA", callsign: "CATHAY" },
    { code: "EVA", callsign: "EVA" },
    { code: "CAL", callsign: "DYNASTY" },

    { code: "SIA", callsign: "SINGAPORE" },
    { code: "QFA", callsign: "QANTAS" },
    { code: "ANZ", callsign: "NEW ZEALAND" },

    { code: "UAE", callsign: "EMIRATES" },
    { code: "QTR", callsign: "QATARI" },
    { code: "THY", callsign: "TURKISH" },

    { code: "PAL", callsign: "PHILIPPINE" },
    { code: "FJI", callsign: "FIJI" }
];


// ============================================================
// IMAGES
// ============================================================

const plane_img = new Image();

plane_img.src = "assets/Plane.png";


// ============================================================
// HTML ELEMENTS
// ============================================================

const slider = document.getElementById("brightness-slider");

const log = document.getElementById("log");

const input = document.getElementById("input-console");

const scoreElement = document.getElementById("score");

const landedElement = document.getElementById("landed");

const aircraftElement = document.getElementById("aircraft-count");

const warningsElement = document.getElementById("warnings");

const pauseButton = document.getElementById("pause-button");


// ============================================================
// BRIGHTNESS
// ============================================================

brightness = Number(slider.value);

slider.addEventListener("input", function () {

    brightness = Number(slider.value);

    document.documentElement.style.setProperty(
        "--brightness",
        brightness
    );

});


// ============================================================
// LOGGING
// ============================================================

function addLog(message) {

    const line = document.createElement("div");

    line.textContent = message;

    log.appendChild(line);

    log.scrollTop = log.scrollHeight;

    while (log.children.length > 100) {
        log.removeChild(log.firstChild);
    }

}


// ============================================================
// SCORE
// ============================================================

function addScore(amount, reason) {

    score += amount;

    if (reason) {

        const prefix = amount >= 0 ? "+" : "";

        addLog(
            `${prefix}${amount} POINTS | ${reason}`
        );

    }

    updateUI();

}

function updateUI() {

    scoreElement.textContent = score;

    landedElement.textContent = landedCount;

    aircraftElement.textContent = planes.length;

    warningsElement.textContent = warningCount;

}


// ============================================================
// MATH
// ============================================================

function normalizeHeading(heading) {

    return ((heading % 360) + 360) % 360;

}


// Screen coordinates:
// 0 = right
// 90 = down
// 180 = left
// 270 = up

function getHeading(x1, y1, x2, y2) {

    return normalizeHeading(
        Math.atan2(
            y2 - y1,
            x2 - x1
        ) * 180 / Math.PI
    );

}


// Convert compass heading to screen heading.

function compassToScreen(heading) {

    return normalizeHeading(heading - 90);

}


// Convert screen heading to compass heading.

function screenToCompass(heading) {

    return normalizeHeading(heading + 90);

}


// ============================================================
// TURN AIRCRAFT
// ============================================================

function turnPlane(plane, heading, maxTurn = 3) {

    const difference = (
        (heading - plane.direction + 540) % 360
    ) - 180;

    const turn = Math.max(
        -maxTurn,
        Math.min(maxTurn, difference)
    );

    plane.direction = normalizeHeading(
        plane.direction + turn
    );

}


// ============================================================
// GENERATE AIRCRAFT
// ============================================================

function generateNewPlane() {

    if (planes.length >= MAX_PLANES) {
        return;
    }

    const airline = airlines[
        Math.floor(Math.random() * airlines.length)
    ];

    const callsign =
        airline.code +
        (Math.floor(Math.random() * 9999) + 1);

    const numberID = nextPlaneId++;

    const side = Math.floor(Math.random() * 4);

    const margin = 40;

    let rand_x;
    let rand_y;

    if (side === 0) {

        rand_x = -margin;

        rand_y = Math.random() * canvas.height;

    }

    else if (side === 1) {

        rand_x = canvas.width + margin;

        rand_y = Math.random() * canvas.height;

    }

    else if (side === 2) {

        rand_x = Math.random() * canvas.width;

        rand_y = -margin;

    }

    else {

        rand_x = Math.random() * canvas.width;

        rand_y = canvas.height + margin;

    }

    const alt = (
        Math.floor(Math.random() * 26) + 5
    ) * 1000;

    const altSpeeds = {
        35000: 450,
        30000: 440,
        25000: 420,
        20000: 380,
        15000: 330,
        10000: 250,
        5000: 210,
        3000: 180,
        2000: 160,
        0: 140
    };

    const closestAltitude = Object.keys(altSpeeds)
        .map(Number)
        .reduce((a, b) =>
            Math.abs(b - alt) < Math.abs(a - alt) ? b : a
        );

    const speed = altSpeeds[closestAltitude];

    const targetX = canvas.width / 2;

    const targetY = canvas.height / 2;

    const randomAngle = normalizeHeading(
        getHeading(
            rand_x,
            rand_y,
            targetX,
            targetY
        ) + (Math.random() * 50 - 25)
    );

    const magnitude =
        speed * PIXELS_PER_KNOT_SECOND;

    const dir_x =
        magnitude *
        Math.cos(Math.PI / 180 * randomAngle);

    const dir_y =
        magnitude *
        Math.sin(Math.PI / 180 * randomAngle);

    planes.push({

        id: numberID,

        callsign: callsign,

        airline: airline.callsign,

        x: rand_x,

        y: rand_y,

        altitude: alt,

        targetAltitude: alt,

        vert_speed: 0,

        speed: speed,

        targetSpeed: speed,

        direction: randomAngle,

        targetHeading: randomAngle,

        direction_vec: [dir_x, dir_y],

        status: 1,

        warning: false,

        collision: false,

        age: 0

    });

    addLog(
        `NEW CONTACT ${numberID} | ${callsign} | ${Math.round(alt)} FT`
    );

    updateUI();

}


// ============================================================
// LANDING SYSTEM
// ============================================================

function landPlane(id, runwayName) {

    const plane = planes.find(
        p => p.id === Number(id)
    );

    const runway = runways.find(
        r => r.name.toUpperCase() === runwayName.toUpperCase()
    );

    if (!plane || !runway) {
        return false;
    }

    if (runway.type !== "Arrivals") {
        return false;
    }

    if (landing_planes.some(p => p.id === plane.id)) {
        return false;
    }

    landing_planes.push({

        id: plane.id,

        runway: runway.name,

        step: 0

    });

    plane.status = 2;

    plane.targetSpeed = 180;

    return true;

}


// ============================================================
// CANCEL APPROACH
// ============================================================

function cancelLanding(id) {

    const index = landing_planes.findIndex(
        p => p.id === id
    );

    if (index === -1) {
        return false;
    }

    landing_planes.splice(index, 1);

    const plane = planes.find(
        p => p.id === id
    );

    if (plane) {

        plane.status = 1;

        plane.targetHeading = plane.direction;

        plane.targetSpeed = Math.max(
            plane.speed,
            180
        );

    }

    return true;

}


// ============================================================
// LANDING UPDATE
// ============================================================

function updateLandingPlanes(dt) {

    for (
        let i = landing_planes.length - 1;
        i >= 0;
        i--
    ) {

        const landing = landing_planes[i];

        const plane = planes.find(
            p => p.id === landing.id
        );

        const runway = runways.find(
            r => r.name === landing.runway
        );

        if (!plane || !runway) {

            landing_planes.splice(i, 1);

            continue;

        }

        const x1 = runway.p1[0];
        const y1 = runway.p1[1];

        const x2 = runway.p2[0];
        const y2 = runway.p2[1];

        const dx = x2 - x1;
        const dy = y2 - y1;

        const length = Math.hypot(dx, dy);

        const nx = dx / length;
        const ny = dy / length;

        const runwayHeading = getHeading(
            x1,
            y1,
            x2,
            y2
        );

        const rx = plane.x - x1;
        const ry = plane.y - y1;

        const along = rx * nx + ry * ny;

        const cross = rx * (-ny) + ry * nx;

        // STEP 0:
        // INTERCEPT EXTENDED CENTERLINE

        if (landing.step === 0) {

            const distance = Math.abs(cross);

            const interceptDistance = Math.max(
                180,
                distance * 2 + 200
            );

            const targetX =
                x1 - nx * interceptDistance;

            const targetY =
                y1 - ny * interceptDistance;

            const targetHeading = getHeading(
                plane.x,
                plane.y,
                targetX,
                targetY
            );

            plane.targetHeading = targetHeading;

            plane.targetSpeed = 180;

            plane.targetAltitude = Math.min(
                plane.targetAltitude,
                3000
            );

            if (
                Math.abs(cross) < 25 &&
                along < -100
            ) {

                landing.step = 1;

                plane.status = 3;

                addLog(
                    `${plane.id} ESTABLISHED ON FINAL`
                );

            }

        }

        // STEP 1:
        // FOLLOW CENTERLINE

        else if (landing.step === 1) {

            const correction = Math.atan2(
                cross,
                Math.max(100, -along)
            ) * 180 / Math.PI;

            const targetHeading = normalizeHeading(
                runwayHeading - correction
            );

            plane.targetHeading = targetHeading;

            plane.targetSpeed = 150;

            plane.targetAltitude = Math.min(
                plane.targetAltitude,
                1500
            );

            if (
                along >= 0 &&
                Math.abs(cross) < 30
            ) {

                landing.step = 2;

                plane.status = 4;

                addLog(
                    `${plane.id} TOUCHDOWN ${runway.name}`
                );

            }

        }

        // STEP 2:
        // LANDING ROLL

        else if (landing.step === 2) {

            plane.targetHeading = runwayHeading;

            plane.targetSpeed = 35;

            plane.targetAltitude = 0;

            if (along >= length) {

                completeLanding(plane, landing, i);

            }

        }

    }

}


// ============================================================
// COMPLETE LANDING
// ============================================================

function completeLanding(plane, landing, landingIndex) {

    const planeIndex = planes.indexOf(plane);

    if (planeIndex !== -1) {
        planes.splice(planeIndex, 1);
    }

    landing_planes.splice(landingIndex, 1);

    landedCount++;

    let points = LANDING_POINTS;

    if (!plane.warning) {
        points += 25;
    }

    addScore(
        points,
        `${plane.callsign} LANDED`
    );

    updateUI();

}


// ============================================================
// AIRCRAFT MOVEMENT
// ============================================================

function simulate(dt) {

    if (paused) {
        return;
    }

    gameTime += dt;

    updateLandingPlanes(dt);

    for (const p of planes) {

        p.age += dt;

        // TURNING

        turnPlane(
            p,
            p.targetHeading,
            MAX_TURN_RATE * dt
        );

        // SPEED CONTROL

        const speedDifference =
            p.targetSpeed - p.speed;

        const speedChange = 8 * dt;

        if (Math.abs(speedDifference) <= speedChange) {

            p.speed = p.targetSpeed;

        } else {

            p.speed += Math.sign(
                speedDifference
            ) * speedChange;

        }

        // ALTITUDE CONTROL

        const altitudeDifference =
            p.targetAltitude - p.altitude;

        const maxAltitudeChange = 30 * dt;

        if (
            Math.abs(altitudeDifference) <=
            maxAltitudeChange
        ) {

            p.altitude = p.targetAltitude;

            p.vert_speed = 0;

        }

        else {

            const change =
                Math.sign(altitudeDifference) *
                maxAltitudeChange;

            p.altitude += change;

            p.vert_speed =
                Math.sign(change) * 1800;

        }

        // DIRECTION VECTOR

        p.direction_vec = [

            p.speed *
            PIXELS_PER_KNOT_SECOND *
            Math.cos(Math.PI / 180 * p.direction),

            p.speed *
            PIXELS_PER_KNOT_SECOND *
            Math.sin(Math.PI / 180 * p.direction)

        ];

        // MOVEMENT

        p.x += p.direction_vec[0] * dt;

        p.y += p.direction_vec[1] * dt;

    }

    checkSeparation();

    removeEscapedPlanes();

}


// ============================================================
// SEPARATION
// ============================================================

const activeWarnings = new Set();

function checkSeparation() {

    for (let i = 0; i < planes.length; i++) {

        for (let j = i + 1; j < planes.length; j++) {

            const a = planes[i];
            const b = planes[j];

            const distance = Math.hypot(
                a.x - b.x,
                a.y - b.y
            );

            const altitudeDifference =
                Math.abs(a.altitude - b.altitude);

            const key = [
                Math.min(a.id, b.id),
                Math.max(a.id, b.id)
            ].join("-");

            const unsafe =
                distance < MIN_SEPARATION &&
                altitudeDifference < ALTITUDE_SEPARATION;

            if (unsafe) {

                a.warning = true;
                b.warning = true;

                if (!activeWarnings.has(key)) {

                    activeWarnings.add(key);

                    warningCount++;

                    addLog(
                        `WARNING: ${a.id} / ${b.id} SEPARATION`
                    );

                    addScore(
                        -20,
                        "SEPARATION VIOLATION"
                    );

                }

                if (
                    distance < COLLISION_DISTANCE &&
                    !a.collision &&
                    !b.collision
                ) {

                    a.collision = true;
                    b.collision = true;

                    collisionCount++;

                    addLog(
                        `COLLISION: ${a.id} / ${b.id}`
                    );

                    addScore(
                        -COLLISION_PENALTY,
                        "AIRCRAFT COLLISION"
                    );

                }

            }

            else {

                activeWarnings.delete(key);

            }

        }

    }

}


// ============================================================
// REMOVE ESCAPED AIRCRAFT
// ============================================================

function removeEscapedPlanes() {

    const margin = 120;

    for (let i = planes.length - 1; i >= 0; i--) {

        const p = planes[i];

        if (p.age < 20) {
            continue;
        }

        const outside =
            p.x < -margin ||
            p.x > canvas.width + margin ||
            p.y < -margin ||
            p.y > canvas.height + margin;

        if (!outside) {
            continue;
        }

        addLog(
            `${p.id} LEFT CONTROLLED AIRSPACE`
        );

        addScore(
            -ESCAPE_PENALTY,
            "MISSED AIRCRAFT"
        );

        landing_planes = landing_planes.filter(
            l => l.id !== p.id
        );

        planes.splice(i, 1);

    }

    updateUI();

}


// ============================================================
// RADAR SNAPSHOT
// ============================================================

function updateRadarPlanes() {

    radar_planes = planes.map(p => ({

        id: p.id,

        callsign: p.callsign,

        x: p.x,

        y: p.y,

        altitude: p.altitude,

        vert_speed: p.vert_speed,

        speed: p.speed,

        direction: p.direction,

        direction_vec: [...p.direction_vec],

        status: p.status,

        warning: p.warning

    }));

}


// ============================================================
// DRAWING HELPERS
// ============================================================

function drawRectRot(x, y, width, height) {

    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(-0.12);

    ctx.beginPath();

    ctx.roundRect(
        -width / 2,
        -height / 2,
        width,
        height,
        20
    );

    ctx.fill();

    ctx.restore();

}


function drawTextRot(text, x, y) {

    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(-0.12);

    ctx.fillStyle = "#ffffff";

    ctx.textAlign = "center";

    ctx.fillText(text, 0, 0);

    ctx.restore();

}


function drawLine(x1, y1, x2, y2) {

    ctx.beginPath();

    ctx.moveTo(x1, y1);

    ctx.lineTo(x2, y2);

    ctx.stroke();

}


// ============================================================
// BACKGROUND
// ============================================================

function drawBackground() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle =
        `rgb(${brightness * 0.7},${brightness * 0.7},${brightness})`;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = `rgb(
        ${Math.max(0, brightness * 0.9 + 30)},
        ${Math.max(0, brightness * 0.9 + 30)},
        ${Math.max(0, brightness * 1.1 + 30)}
    )`;

    drawRectRot(250, 290, 240, 50);

    drawRectRot(300, 335, 240, 85);

    drawRectRot(350, 375, 280, 50);

    ctx.font = "20px 'VT323', monospace";

    drawTextRot("KLAX", 280, 330);

    ctx.font = "10px 'VT323', monospace";

    drawTextRot(
        "(Los Angeles International Airport)",
        280,
        350
    );

    // RUNWAYS

    ctx.strokeStyle = "#ffffff";

    ctx.lineWidth = 4;

    ctx.lineCap = "butt";

    for (const r of runways) {

        drawLine(
            r.p1[0],
            r.p1[1],
            r.p2[0],
            r.p2[1]
        );

    }

    // APPROACH LINES

    ctx.save();

    ctx.strokeStyle = "#efefef";

    ctx.lineWidth = 2;

    ctx.setLineDash([8, 8]);

    runways.forEach(r => {

        if (r.type !== "Arrivals") {
            return;
        }

        const dx = r.p1[0] - r.p2[0];

        const dy = r.p1[1] - r.p2[1];

        const length = Math.hypot(dx, dy);

        const nx = dx / length;

        const ny = dy / length;

        const finalLength = 1000;

        ctx.beginPath();

        ctx.moveTo(
            r.p1[0],
            r.p1[1]
        );

        ctx.lineTo(
            r.p1[0] + nx * finalLength,
            r.p1[1] + ny * finalLength
        );

        ctx.stroke();

    });

    ctx.restore();

}


// ============================================================
// DRAW AIRCRAFT
// ============================================================

function drawPlanes() {

    for (const p of radar_planes) {

        if (
            p.x < 0 ||
            p.x > canvas.width ||
            p.y < 0 ||
            p.y > canvas.height
        ) {
            continue;
        }

        ctx.save();

        ctx.translate(p.x, p.y);

        ctx.rotate(
            Math.PI / 180 * p.direction
        );

        if (
            plane_img.complete &&
            plane_img.naturalWidth > 0
        ) {

            ctx.drawImage(
                plane_img,
                -20,
                -20,
                50,
                40
            );

        }

        else {

            ctx.fillStyle = "#ffffff";

            ctx.beginPath();

            ctx.moveTo(15, 0);

            ctx.lineTo(-10, -8);

            ctx.lineTo(-5, 0);

            ctx.lineTo(-10, 8);

            ctx.closePath();

            ctx.fill();

        }

        ctx.restore();

        ctx.strokeStyle =
            p.warning ? "#ff7777" : "#ffffff";

        ctx.lineWidth = 2;

        ctx.lineCap = "butt";

        drawLine(
            p.x + p.direction_vec[0] * 1,
            p.y + p.direction_vec[1] * 1,
            p.x + p.direction_vec[0] * 5,
            p.y + p.direction_vec[1] * 5
        );

        const dir_pos = p.direction_vec[1] < 0;

        ctx.fillStyle =
            p.warning ? "#ff7777" : "#ffffff";

        ctx.font = "14px 'VT323', monospace";

        ctx.fillText(
            String(p.callsign),
            p.x - 20,
            p.y - 40 + (80 * dir_pos)
        );

        ctx.font = "13px 'VT323', monospace";

        const altitudeText =
            String(
                Math.floor(p.altitude / 100)
            ).padStart(3, "0");

        const verticalSymbol =
            p.vert_speed > 0
                ? "↑"
                : p.vert_speed < 0
                    ? "↓"
                    : "-";

        const altitudeLine =
            altitudeText +
            " " +
            verticalSymbol +
            String(
                Math.abs(p.vert_speed)
            );

        const statLines = [

            altitudeLine,

            String(p.id),

            String(
                Math.floor(p.speed / 10)
            ).padStart(2, "0") + " KTS"

        ];

        ctx.fillText(
            statLines[stat_rotation],
            p.x - 20,
            p.y - 54 + (108 * dir_pos)
        );

        const statusNames = [
            "ASC",
            "C",
            "DES",
            "FIN",
            "G"
        ];

        const statusLine = [
            statusNames[p.status] || "C",

            String(
                Math.round(
                    screenToCompass(p.direction)
                )
            ).padStart(3, "0") + " DEG",

            ""
        ];

        ctx.fillText(
            statusLine[stat_rotation],
            p.x - 20,
            p.y - 68 + (136 * dir_pos)
        );

    }

}


// ============================================================
// DRAW RADAR
// ============================================================

function draw() {

    drawBackground();

    drawPlanes();

}


// ============================================================
// COMMAND INPUT
// ============================================================

input.addEventListener("keydown", event => {

    if (event.key !== "Enter") {
        return;
    }

    const command = input.value.trim();

    if (command === "") {
        return;
    }

    addLog(">" + command);

    runCommand(command);

    input.value = "";

});


// ============================================================
// COMMAND PARSER
// ============================================================

function runCommand(command) {

    const tokens = command
        .trim()
        .toUpperCase()
        .split(/\s+/);

    if (tokens.length === 0) {
        return;
    }

    // HELP

    if (tokens[0] === "HELP") {

        addLog("COMMANDS:");

        addLog("ID * HEADING");

        addLog("ID => RUNWAY");

        addLog("ID ALT FEET");

        addLog("ID SPD KNOTS");

        addLog("ID STAT");

        addLog("ID CANCEL");

        addLog("SCORE | LIST | HELP");

        return;

    }

    // SCORE

    if (tokens[0] === "SCORE") {

        addLog(`SCORE: ${score}`);

        addLog(`LANDED: ${landedCount}`);

        addLog(`WARNINGS: ${warningCount}`);

        addLog(`COLLISIONS: ${collisionCount}`);

        return;

    }

    // LIST

    if (tokens[0] === "LIST") {

        if (planes.length === 0) {

            addLog("NO AIRCRAFT");

            return;

        }

        for (const p of planes) {

            addLog(
                `${p.id} ${p.callsign} | ${Math.round(p.altitude)} FT`
            );

        }

        return;

    }

    const id = Number(tokens[0]);

    if (!Number.isInteger(id)) {

        addLog("UNKNOWN COMMAND");

        return;

    }

    const plane = planes.find(
        p => p.id === id
    );

    if (!plane) {

        addLog("AIRCRAFT NOT FOUND");

        return;

    }

    // HEADING

    if (
        tokens.length === 3 &&
        tokens[1] === "*"
    ) {

        const heading = Number(tokens[2]);

        if (!Number.isFinite(heading)) {

            addLog("INVALID HEADING");

            return;

        }

        if (heading < 0 || heading > 360) {

            addLog("HEADING MUST BE 000-360");

            return;

        }

        cancelLanding(id);

        plane.targetHeading =
            compassToScreen(heading);

        addLog(
            `${id} TURN HEADING ${heading}`
        );

        return;

    }

    // LANDING

    if (
        tokens.length === 3 &&
        tokens[1] === "=>"
    ) {

        const success = landPlane(
            id,
            tokens[2]
        );

        if (success) {

            addLog(
                `${id} CLEARED APPROACH ${tokens[2]}`
            );

        }

        else {

            addLog("INVALID AIRCRAFT OR RUNWAY");

        }

        return;

    }

    // ALTITUDE

    if (
        tokens.length === 3 &&
        tokens[1] === "ALT"
    ) {

        const altitude = Number(tokens[2]);

        if (
            !Number.isFinite(altitude) ||
            altitude < 0 ||
            altitude > 40000
        ) {

            addLog("INVALID ALTITUDE");

            return;

        }

        plane.targetAltitude = altitude;

        addLog(
            `${id} ALTITUDE SET ${altitude} FT`
        );

        return;

    }

    // SPEED

    if (
        tokens.length === 3 &&
        tokens[1] === "SPD"
    ) {

        const speed = Number(tokens[2]);

        if (
            !Number.isFinite(speed) ||
            speed < 100 ||
            speed > 500
        ) {

            addLog("INVALID SPEED");

            return;

        }

        plane.targetSpeed = speed;

        addLog(
            `${id} SPEED SET ${speed} KTS`
        );

        return;

    }

    // STATUS

    if (
        tokens.length === 2 &&
        tokens[1] === "STAT"
    ) {

        const landing = landing_planes.find(
            p => p.id === id
        );

        addLog(
            `${plane.callsign} | ID ${id}`
        );

        addLog(
            `ALT ${Math.round(plane.altitude)} FT | SPD ${Math.round(plane.speed)}`
        );

        addLog(
            `HDG ${Math.round(screenToCompass(plane.direction))}`
        );

        if (landing) {

            addLog(
                `APPROACH ${landing.runway} | STEP ${landing.step}`
            );

        }

        else {

            addLog("STATUS: RADAR CONTROL");

        }

        return;

    }

    // CANCEL

    if (
        tokens.length === 2 &&
        tokens[1] === "CANCEL"
    ) {

        const success = cancelLanding(id);

        if (success) {

            addLog(
                `${id} APPROACH CANCELLED`
            );

        }

        else {

            addLog(
                `${id} NO ACTIVE APPROACH`
            );

        }

        return;

    }

    addLog("UNKNOWN COMMAND");

}


// ============================================================
// PAUSE BUTTON
// ============================================================

pauseButton.addEventListener("click", () => {

    paused = !paused;

    pauseButton.textContent =
        paused ? "RESUME" : "PAUSE";

    addLog(
        paused ? "SIMULATION PAUSED" : "SIMULATION RESUMED"
    );

});


// ============================================================
// START GAME
// ============================================================

function startGame() {

    addLog("KLAX AIR TRAFFIC CONTROL");

    addLog("RADAR SYSTEM ONLINE");

    addLog("TYPE HELP FOR COMMANDS");

    for (let i = 0; i < INITIAL_PLANES; i++) {

        generateNewPlane();

    }

    updateRadarPlanes();

    updateUI();

}


// ============================================================
// GAME LOOP
// ============================================================

let lastTime = performance.now();

function animate(time) {

    const dt = Math.min(
        (time - lastTime) / 1000,
        0.1
    );

    lastTime = time;

    if (!paused) {

        simulate(dt * GAME_SPEED);

        radarTimer += dt * 1000;

        spawnTimer += dt * 1000;

        statTimer += dt * 1000;

        // RADAR UPDATE EVERY 4.8 SECONDS

        if (radarTimer >= RADAR_INTERVAL) {

            updateRadarPlanes();

            radarTimer %= RADAR_INTERVAL;

        }

        // STAT ROTATION

        if (statTimer >= 2000) {

            stat_rotation =
                (stat_rotation + 1) % 3;

            statTimer %= 2000;

        }

        // SPAWN AIRCRAFT

        if (spawnTimer >= SPAWN_INTERVAL) {

            spawnTimer %= SPAWN_INTERVAL;

            if (planes.length < MAX_PLANES) {

                const amount =
                    Math.floor(Math.random() * 4) + 1;

                for (let i = 0; i < amount; i++) {

                    if (planes.length >= MAX_PLANES) {
                        break;
                    }

                    generateNewPlane();

                }

            }

        }

    }

    draw();

    requestAnimationFrame(animate);

}


// ============================================================
// INITIALIZE
// ============================================================

startGame();

requestAnimationFrame(animate);