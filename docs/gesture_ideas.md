# 💡 Gesztus Ötletek (Jövőbeli Fejlesztések)

Ez a fájl a még nem implementált, de tervezett gesztusokat tartalmazza, **módok szerint csoportosítva**.

---

# 🌌 PARTICLE STORM (Részecske Vihar)
> `synesthetic-particles.html` - A-Frame/Three.js alapú

## ✅ Implementálva

### Iker Gömbök (Kétkezes Szinkronizált Csipetés)
- **Státusz**: ✅ KÉSZ (2026-01-30)
- Két kicsi, stabil gömb jelenik meg
- Szétválaszthatóak és mozgathatóak
- Közelítéskor "vízcsepp" összeolvadás

## 🎯 Magas Prioritás

### 1. Taszítás / Robbanás (Jobb Tenyér Le)
- Push-out effekt, eltaszítja a részecskéket
- Ellentéte a vonzásnak

### 2. Shockwave (Gyors Kézmozdulat)
- Hullám terjed a kézből kifelé
- "Wow" faktor
- **Nehézség**: Közepes (sebességvektor alapján)

### 3. Energia Sugár Stream (Két Mutató Összeér)
- Lightning arc / villámlás a két ujj között
- Részecskék folynak az íven
- **Nehézség**: Magas (vonalrajzolás shaderben)

## 🔮 Közepes Prioritás

### 4. Két Ököl → Super Freeze
- Teljes megállás + kristályosodás / jéghatás

### 5. Bal Ököl → Implózió
- Minden részecske gyors behúzása egy pontba

### 6. Tűzijáték (Jobb Tenyér Fel)
- Részecskék színesen szóródnak szét felfelé

### 7. Galaxis (Két Kéz Lassan Közelít)
- Spirális, örvénylő mozgás középen

## 💭 Ötletek (Kísérleti)

### 8. Kéz Forgatás → Keringés
- A részecskék a kezed körül orbitálnak

### 9. Ujj Csettintés → Instant Szétszórás
- Villámgyors robbanás (ha van csettintés detektálás)
- **Nehézség**: Magas (nincs natív WebXR support)

### 10. Lassú Simítás → Festés
- A részecskék követik a kezed útját, nyomot hagyva

### 11. Gravitáció Boost (Tenyér + Lefelé Mozgatás)
- Erős lefelé húzás, minden leesik

### 12. 🌀 Dr. Strange Portál (Kör Rajzolás)
- **Gesztus**: Egyik kézzel kört rajzolsz a levegőbe
- **Hatás**: Izzó, narancssárga/arany portálgyűrű jelenik meg
- **Vizuális elemek**:
  - Szikrázó, tüzes részecskék a kör szélén
  - Mandala-szerű belső mintázat
  - Forgó rúnák / szimbólumok
  - Közepén "ablak" másik dimenzióba (shader effekt)
- **Animáció**: A kör kirajzolódik ahogy mozog a kéz, majd "bezáródik" és stabil marad
- **Nehézség**: Magas (kézútvonal követés + shader)

### 13. Részecske Farok (Kéz Mozgatás Közben)
- Comet tail effekt, nyomod húzza a részecskéket

### 14. Szív Formálás (Két Kéz Összetéve)
- Részecskék szív alakba rendeződnek

### 15. Tükör (Két Tenyér Szemben)
- Részecskék szimmetrikusan tükröződnek

---

# 🔮 PULSE ORB (Pulzáló Gömb)
> `react-sphere.html` - React Three Fiber alapú, audio-reaktív organikus gömb

## ✅ Implementálva

### 👆 Highlight / Rámutatás
- **Gesztus**: Mutass az ujjaddal a gömbre
- **Hatás**: Fényes "spotlight" jelenik meg ahol a sugár metszi a gömböt
- **Viselkedés**: Követi a kéz irányát valós időben
- **Fájlok**: `RaycastHighlight.jsx`, `HandTracking.jsx`

### 💥 Supernova / Robbanás (Két Kéz Széthúzás)
- **Gesztus**: Húzd szét mindkét kezed (VR-ben)
- **Hatás**: A gömb "felrobban" - a kapszulák távolra szóródnak egymástól
- **Viselkedés**: 
  - Kezek közel = tömör gömb (1.0 radius)
  - Kezek távol = kitágult gömb (6.0 radius, 4x nagyobb)
  - Kapszulák továbbra is pulzálnak a zenére!
- **Desktop teszt**: Space = nagyít, Shift = kicsinyít
- **Fájlok**: `SupernovaGesture.jsx`, `InstancedSphere.jsx`

## 🟡 Fejlesztés Alatt

### 🌊 Ripple / Hullám (Mutatóujj Érintés)
- **Gesztus**: Mutatóujjal érintsd meg a szinesztétikus gömbhéjat
- **Hatás**: Koncentrikus hullámok terjednek az érintési ponttól
- **Vizuális elemek**:
  - Pont-alapú gömbhéj deformáció
  - Shader-alapú hullámterjedés
  - Fényesség változás a hullám csúcsán
- **Státusz**: 🟡 Fejlesztés alatt (2026-01)
- **Fájlok**: `InstancedSphere.jsx`, `HandTracking.jsx`
- **Nehézség**: Közepes (shader uniform + időalapú terjedés)

## 🎯 Tervezett

### 🎵 Audioreaktív Deformáció
- **Gesztus**: Automatikus (hangelemzés alapján)
- **Hatás**: A gömb pulzál és deformálódik a zene ütemére
- **Komponensek**:
  - FFT frekvencia elemzés
  - Bass → gömb méret
  - Mid → textúra intenzitás
  - High → részecske szikrák
- **Fájlok**: `AudioAnalyzer.js`
- **Nehézség**: Közepes (Web Audio API + FFT)

### ✋ Közelítés Reaktivitás
- **Gesztus**: Kéz közelítése a gömbhöz
- **Hatás**: A közeli pontok "kitérnek" vagy "vonzódnak" a kézhöz
- **Variánsok**:
  - Nyitott tenyér → taszítás
  - Zárt ököl → vonzás
- **Nehézség**: Alacsony (raycast + távolságszámítás)

### 🔄 Forgatás (Két Kéz Fogás)
- **Gesztus**: Mindkét kézzel megfogod a gömböt és forgatod
- **Hatás**: A gömb fizikailag forog, lendületet kap
- **Viselkedés**: Inertia-alapú forgás, lassulással

### 🔊 Gömb "Megszólaltatás"
- **Gesztus**: Megérintés vagy ütés
- **Hatás**: A gömb hangot ad ki mint egy hangszer
- **Variánsok**:
  - Különböző pontok = különböző hangmagasság
  - Ütés erőssége = hangerő
- **Nehézség**: Közepes (kollízió detektálás + Web Audio)

### 🌈 Színváltás (Csippentés + Húzás)
- **Gesztus**: Csípj össze és húzd végig a gömbön
- **Hatás**: A gömb színe/textúrája változik a húzás irányában
- **Nehézség**: Alacsony (shader uniform frissítés)

### 🧲 Magnetism (Mágnes)
- **Gesztus**: Nyitott tenyérrel közelítés a gömbhöz
- **Hatás**: A gömb felülete "kidudorodik" és vonzódik a kezedhez (mint a folyékony fém/Venom)
- **Nehézség**: Magas (Vertex shader vertex elmozdítás távolság alapján)

### 📐 Shape Shifter (Alakváltó)
- **Gesztus**: Kézi formázás
  - Háromszög (ujjak összeérintése) -> Piramis
  - L-alakok (Box) -> Kocka
- **Hatás**: A gömb geometriája átalakul (Sphere -> Box/Tetrahedron)
- **Nehézség**: Magas (Hand tracking alakfelismerés + Geometry morphing)

### 🌪️ Tornado (Tölcsér)
- **Gesztus**: Mutatóujjal gyors körözés felfelé
- **Hatás**: A gömb/részecskék egy felfelé törő spirálba rendeződnek
- **Nehézség**: Közepes (Velocity mező manipuláció)

---

# 🌀 DIMENSION WARP (Dimenzió Ugrás)
> `dimension-warp.html` - Passzív, audio-reaktív

## 💭 Lehetséges Gesztusok

### 🤲 Sebesség Kontroll (Két Kéz Távolsága)
- **Gesztus**: Két tenyér közelítése/távolítása
- **Hatás**: Az alagút sebessége változik
- **Közel** = lassú, meditációs
- **Távol** = gyors, intenzív

### 🎨 Színpaletta Váltás (Körkörös Mozdulat)
- **Gesztus**: Körkörös kézmozgás
- **Hatás**: Új színpaletta aktiválódik (neon, sunset, ice, fire stb.)

### ⏸️ Freeze Frame (Ököl)
- **Gesztus**: Mindkét kéz ökölbe
- **Hatás**: Az alagút megáll, screenshot-szerű pillanat

### 🔭 Zoom (Kéz Előre/Hátra)
- **Gesztus**: Kéz előre nyújtás / visszahúzás
- **Hatás**: FOV változás, "belemerülés" az alagútba

---

# 🛠️ Technikai Kihívások Összefoglaló

| Gesztus | Mód | Nehézség | Megjegyzés |
|---------|-----|----------|------------|
| Shockwave | Particle | Közepes | Sebességvektor alapján |
| Villámlás | Particle | Magas | Vonalrajzolás shaderben |
| Csettintés | Particle | Magas | Nincs natív WebXR support |
| Kör rajzolás | Particle | Magas | Gesztus felismerés szükséges |
| Ripple | Sphere | Közepes | Shader uniform + időalapú terjedés |
| Audioreaktív | Sphere | Közepes | Web Audio API + FFT |
| Közelítés detektálás | Sphere | Alacsony | Raycast + távolságszámítás |
| Sebesség kontroll | Warp | Alacsony | Két pont távolsága |

---

# 🔧 Implementációs Megjegyzések

## Particle Storm (A-Frame)
- `tick()` alapú frissítés
- Custom A-Frame komponensek
- Event-alapú kommunikáció (`gesture-pinch` stb.)

## Pulse Orb (React Three Fiber)
- `useFrame` hook frame-enkénti frissítés
- `useXR` hook XR session és kéz adatok
- Ref-alapú kommunikáció: `sphereRef.current.triggerRipple(origin)`
- Shader uniformok: `useEffect` + `ref.current.material.uniforms`

### Fontos különbségek:
| A-Frame | React Three Fiber |
|---------|-------------------|
| `tick()` | `useFrame()` |
| `this.el` | React refs |
| Komponens regisztráció | React komponensek |
| Event-ek | Callback props + refs |
