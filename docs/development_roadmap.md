# 🚀 Fejlesztési Terv (Roadmap)

A Synesthetic VR részecske-rendszerének és gesztusainak jövőbeli fejlesztési irányai.

## 1. Reset (Visszarendeződés) Finomhangolása 🔄
Jelenleg a reset fizikája már "folyékony", de még hiányzik a visszajelzés (feedback).
*   **Vizuális Feedback**:
    *   [ ] **Scanline effekt**: Egy fényes csík fusson végig a téren reset közben.
    *   [ ] **Szín-impulzus**: A részecskék villanjanak fel fehéren, mielőtt visszaúsznak.
    *   [ ] **Utókép / Trail**: Húzzanak csíkot maguk után a visszatérés közben.
*   **Audio**:
    *   [ ] **Reverse Sound**: Egy "visszafelé lejátszott" hangeffekt (pl. szalagcsévélés vagy szívás hang) lejátszása reset közben.
*   **Fizika**:
    *   [ ] **Spirál pálya**: Ne egyenesen, hanem spirálban csavarodva térjenek haza.

## 2. Sugár (Beam) Továbbfejlesztése 🔦
A jelenlegi "vasember" sugár jó, de lehetne látványosabb.
*   **Ütközés**:
    *   [ ] Ha a sugár falba vagy tárgyba ütközik, szóródjanak szét a részecskék (szikraeső).
*   **Töltés**:
    *   [ ] Az ujjad hegyén gyűljön az energia (izzás), mielőtt kilövöd.

## 3. Levitáció (Anti-Gravitáció) 🪶
*   [ ] **Audio-reaktivitás**: A lebegés magassága vagy hullámzása reagáljon a zene basszusára.
*   [ ] **Irányítás**: A tenyér döntésével lehessen "terelni" a lebegő felhőt jobbra-balra.

## 4. Teljesítmény Optimalizálás ⚡
*   [ ] **WebWorker Fizika**: A számítások kiszervezése külön szálra, hogy a renderelés (FPS) sose akadjon meg.
*   [ ] **GPU Compute Shader**: (Hosszú táv) Átírni a fizikát WebGPU-ra a milliós részecskeszám eléréséhez.

## 5. Gesztus Robusztusság & Prioritások 🛡️
*   [ ] **Bal Kéz Konfliktusok**: A Levitáció (Tenyér) és Szingularitás (Mutatás) közötti átmenet finomítása. Jelenleg prioritási sorrenddel van megoldva, de később érdemes lehet explicit "Palm Normal" vizsgálatot tenni a Mutatáshoz is.
*   [ ] **False Positives**: Tovább szűrni a véletlen gesztusokat (pl. ökölbe szorítás közbeni csippentés).
*   [ ] **Kétkezes Interakciók**: Megvizsgálni, hogy az egykezes effektek mennyire zavarják a kétkezeseket (pl. Reset).

## 6. Fizikai Kéz-Ütközés (Hard Collision) ✋🛑
A kéz legyen "tömör" tárgy, ne csak erőtér.
*   [ ] **Gömb Ütközők**: Sphere Colliders az ujjpercekre a fizikai interakcióhoz.
*   [ ] **Merítés**: A részecskék lepattannának a tenyérről, lehetne "meríteni" belőlük.

## 7. Taps & Csettintés (Hangalapú Gesztusok) 👏🫰
*   [ ] **Taps (Clap)**: Hatalmas lökéshullám (Shockwave) indítása, "Clear" funkció.
*   [ ] **Csettintés (Snap)**: Véletlenszerű színváltás vagy részecske-felezés (Thanos-effekt).

## 8. Környezeti Ütközés (Floor & Walls) 🧱
*   [ ] **Padló**: A részecskék ne a semmibe hulljanak, hanem terüljenek szét a padlón.
*   [ ] **Fal-ütközés**: A sugarak (Beam) pattanjanak le vagy szóródjanak szét a falakon.

## 9. Audio-Reaktivitás (Mikrofon) 🎤🎵
*   [ ] **Voice Control**: Beszédre/Kiabálásra reagáló remegés vagy izzás.
*   [ ] **Basszus**: A zene ütemére pulzáló erőtér.
