const hexMap = {
    "Saudi Arabia": "#006C35",
    "Uruguay": "#0038A8",
};
const getTeamColorHex = (name) => hexMap[name] || "#737373";

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

const isSimilar = (hex1, hex2) => {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    const distance = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
    console.log("Distance between", hex1, "and", hex2, "is", distance);
    return distance < 100;
};

let home_team = "Saudi Arabia";
let away_team = "Uruguay";

let colorHome = getTeamColorHex(home_team);
let colorAway = getTeamColorHex(away_team);

if (isSimilar(colorHome, colorAway)) {
    console.log("They are similar! Changing colorAway...");
}

console.log("Final colors:", { colorHome, colorAway });
