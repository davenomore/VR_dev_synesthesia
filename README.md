# WebXR Quest 3 Demo

Ez egy egyszerű "Hello World" WebXR projekt A-Frame használatával.

## Fájlok
- `index.html`: A fő forráskód.

## Indítás (Javasolt módszer)

A Python szerver helyett használjuk a **Vite**-ot, ami megbízhatóbb és jobban kezeli a hálózati címeket.

### 1. Előkészítés (csak egyszer kell)
Futtasd a terminálban:
```bash
npm install
```

### 2. Szerver indítása
```bash
npm run dev
```
Vagy ha nem akarsz telepíteni semmit:
```bash
npx vite --host
```

### 3. Csatlakozás
A terminál ki fogja írni a helyi IP címedet, például:
`> Network:  http://192.168.0.36:5173/`

Ezt a címet nyisd meg a Quest 3 böngészőjében!

## Hibaelhárítás: "Nem éri el"
Ha a Quest nem tölti be az oldalt:
1. **Wifi**: Ellenőrizd, hogy a Mac és a Quest **ugyanazon** a Wifi hálózaton van-e! (Ha a Mac kábelen van, néha az külön alhálózat lehet).
2. **Tűzfal**: A macOS tűzfal néha blokkolja a bejövő kapcsolatokat. 
   - Rendszerbeállítások -> Hálózat -> Tűzfal -> Beállítások -> Kapcsold ki átmenetileg vagy engedélyezd a `node`-ot.
3. **HTTPS**: A WebXR "Immersive VR" gombja néha csak HTTPS-en működik (vagy localhoston). Ha betölt az oldal, de nem enged VR-ba lépni, akkor HTTPS-t kell beállítanunk (pl. `vite-plugin-mkcert`-tel), de első körben csak töltsön be az oldal.
