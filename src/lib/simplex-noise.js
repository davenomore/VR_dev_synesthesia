/**
 * 4D Simplex Noise with Curl Noise
 * Optimized for particle flow fields
 * Based on Stefan Gustavson's implementation
 */

// Permutation table
const perm = new Uint8Array(512);
const gradP = new Float32Array(512 * 4);

// Gradient vectors for 4D
const grad4 = [
    [0, 1, 1, 1], [0, 1, 1, -1], [0, 1, -1, 1], [0, 1, -1, -1],
    [0, -1, 1, 1], [0, -1, 1, -1], [0, -1, -1, 1], [0, -1, -1, -1],
    [1, 0, 1, 1], [1, 0, 1, -1], [1, 0, -1, 1], [1, 0, -1, -1],
    [-1, 0, 1, 1], [-1, 0, 1, -1], [-1, 0, -1, 1], [-1, 0, -1, -1],
    [1, 1, 0, 1], [1, 1, 0, -1], [1, -1, 0, 1], [1, -1, 0, -1],
    [-1, 1, 0, 1], [-1, 1, 0, -1], [-1, -1, 0, 1], [-1, -1, 0, -1],
    [1, 1, 1, 0], [1, 1, -1, 0], [1, -1, 1, 0], [1, -1, -1, 0],
    [-1, 1, 1, 0], [-1, 1, -1, 0], [-1, -1, 1, 0], [-1, -1, -1, 0]
];

// Initialize with seed
function seed(s) {
    s = s || Math.random() * 65536;
    if (s < 1) s *= 65536;
    s = Math.floor(s);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        p[i] = i;
    }

    // Shuffle using seed
    for (let i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        const g = grad4[perm[i] % 32];
        gradP[i * 4] = g[0];
        gradP[i * 4 + 1] = g[1];
        gradP[i * 4 + 2] = g[2];
        gradP[i * 4 + 3] = g[3];
    }
}

// Initialize with random seed
seed(Math.random() * 65536);

// Skewing factors for 4D
const F4 = (Math.sqrt(5) - 1) / 4;
const G4 = (5 - Math.sqrt(5)) / 20;

/**
 * 4D Simplex Noise
 */
function noise4D(x, y, z, w) {
    // Skew input space
    const s = (x + y + z + w) * F4;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const l = Math.floor(w + s);

    // Unskew
    const t = (i + j + k + l) * G4;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const W0 = l - t;

    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;
    const w0 = w - W0;

    // Determine simplex
    let rankx = 0, ranky = 0, rankz = 0, rankw = 0;
    if (x0 > y0) rankx++; else ranky++;
    if (x0 > z0) rankx++; else rankz++;
    if (x0 > w0) rankx++; else rankw++;
    if (y0 > z0) ranky++; else rankz++;
    if (y0 > w0) ranky++; else rankw++;
    if (z0 > w0) rankz++; else rankw++;

    const i1 = rankx >= 3 ? 1 : 0, j1 = ranky >= 3 ? 1 : 0, k1 = rankz >= 3 ? 1 : 0, l1 = rankw >= 3 ? 1 : 0;
    const i2 = rankx >= 2 ? 1 : 0, j2 = ranky >= 2 ? 1 : 0, k2 = rankz >= 2 ? 1 : 0, l2 = rankw >= 2 ? 1 : 0;
    const i3 = rankx >= 1 ? 1 : 0, j3 = ranky >= 1 ? 1 : 0, k3 = rankz >= 1 ? 1 : 0, l3 = rankw >= 1 ? 1 : 0;

    const x1 = x0 - i1 + G4, y1 = y0 - j1 + G4, z1 = z0 - k1 + G4, w1 = w0 - l1 + G4;
    const x2 = x0 - i2 + 2 * G4, y2 = y0 - j2 + 2 * G4, z2 = z0 - k2 + 2 * G4, w2 = w0 - l2 + 2 * G4;
    const x3 = x0 - i3 + 3 * G4, y3 = y0 - j3 + 3 * G4, z3 = z0 - k3 + 3 * G4, w3 = w0 - l3 + 3 * G4;
    const x4 = x0 - 1 + 4 * G4, y4 = y0 - 1 + 4 * G4, z4 = z0 - 1 + 4 * G4, w4 = w0 - 1 + 4 * G4;

    const ii = i & 255, jj = j & 255, kk = k & 255, ll = l & 255;

    let n = 0;

    // Corner contributions
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
    if (t0 > 0) {
        const gi = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
        t0 *= t0;
        n += t0 * t0 * (gradP[gi] * x0 + gradP[gi + 1] * y0 + gradP[gi + 2] * z0 + gradP[gi + 3] * w0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
    if (t1 > 0) {
        const gi = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
        t1 *= t1;
        n += t1 * t1 * (gradP[gi] * x1 + gradP[gi + 1] * y1 + gradP[gi + 2] * z1 + gradP[gi + 3] * w1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
    if (t2 > 0) {
        const gi = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
        t2 *= t2;
        n += t2 * t2 * (gradP[gi] * x2 + gradP[gi + 1] * y2 + gradP[gi + 2] * z2 + gradP[gi + 3] * w2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
    if (t3 > 0) {
        const gi = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
        t3 *= t3;
        n += t3 * t3 * (gradP[gi] * x3 + gradP[gi + 1] * y3 + gradP[gi + 2] * z3 + gradP[gi + 3] * w3);
    }

    let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
    if (t4 > 0) {
        const gi = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
        t4 *= t4;
        n += t4 * t4 * (gradP[gi] * x4 + gradP[gi + 1] * y4 + gradP[gi + 2] * z4 + gradP[gi + 3] * w4);
    }

    return 27 * n;
}

/**
 * Curl Noise for divergence-free flow
 * Returns velocity vector [vx, vy, vz]
 */
function curlNoise4D(x, y, z, w, epsilon = 0.0001) {
    // Compute partial derivatives using central differences
    const dndx = (noise4D(x + epsilon, y, z, w) - noise4D(x - epsilon, y, z, w)) / (2 * epsilon);
    const dndy = (noise4D(x, y + epsilon, z, w) - noise4D(x, y - epsilon, z, w)) / (2 * epsilon);
    const dndz = (noise4D(x, y, z + epsilon, w) - noise4D(x, y, z - epsilon, w)) / (2 * epsilon);

    // Using a second noise field for more interesting curl
    const x2 = x + 100;
    const dn2dx = (noise4D(x2 + epsilon, y, z, w) - noise4D(x2 - epsilon, y, z, w)) / (2 * epsilon);
    const dn2dy = (noise4D(x2, y + epsilon, z, w) - noise4D(x2, y - epsilon, z, w)) / (2 * epsilon);
    const dn2dz = (noise4D(x2, y, z + epsilon, w) - noise4D(x2, y, z - epsilon, w)) / (2 * epsilon);

    // Curl = ∇ × F
    return [
        dndy - dn2dz,  // vx
        dndz - dn2dx,  // vy
        dn2dy - dndx   // vz
    ];
}

/**
 * Simplified curl for performance (less accurate but faster)
 */
function curlNoise4DFast(x, y, z, w) {
    const n1 = noise4D(x, y, z, w);
    const n2 = noise4D(x + 100, y + 100, z + 100, w);
    const n3 = noise4D(x + 200, y + 200, z + 200, w);

    return [
        n2 - n3,
        n3 - n1,
        n1 - n2
    ];
}

export { noise4D, curlNoise4D, curlNoise4DFast, seed };
