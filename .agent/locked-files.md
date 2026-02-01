# 🔒 Véglegesített Elemek (Locked)

Az alábbi fájlokat és funkciókat **NE MÓDOSÍTSD**, mert a user véglegesítette őket.

---

## Zárolt Fájlok
<!-- Add ide a fájl útvonalát, pl: -->
<!-- - src/components/gpu-particles.js -->

## Zárolt Funkciók / Értékek

### ✅ Jobb Kéz Csipetés (Right Pinch → Orb)
- **Húzóerő**: `65.0 / (d + 0.4)`
- **Sebesség szorzó**: `delta * 0.12`
- **Orb sugár**: `0.15 + orbSize * 0.5`
- **Swirl**: `cross(dir, vec3(0,1,0)) * 3.0`

### ✅ Jobb Ökölbe (Right Fist → Time Freeze)
- **Damping**: `vel *= 0.1` (erős lassítás)

---

**Használat**: Ha véglegesíteni akarsz valamit, írd ide vagy mondd: "zárd le a [fájl/funkció] -t".
