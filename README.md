# Salted Egg Machine Simulator

Web-based **3D simulator** for a **Salted Egg Cleaning and Sorting Machine**, built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **React Three Fiber** (Three.js). It loads the CAD-derived **`machine.fbx`** model, shows a control panel for stages and stats, and animates a simplified egg path through the line.

---

## Installation guide (for students)

Follow these steps **in order**. Kung may error, basahin ang [Troubleshooting](#troubleshooting) sa ibaba.

### 1. Install Node.js

- I-download ang **LTS** version mula sa [https://nodejs.org](https://nodejs.org).
- I-install, tapos **buksan muli** ang terminal (PowerShell, Command Prompt, o VS Code terminal).
- I-check kung OK na:

  ```bash
  node -v
  npm -v
  ```

  Dapat may lumabas na version numbers (hal. `v22.x.x` at `10.x.x`).

### 2. Open the project folder

Sa terminal, pumunta sa folder ng project (iyong may `package.json`):

```bash
cd "path\to\Salted Egg Machine Simulator"
```

*(Palitan ang `path\to` ng tunay na lokasyon sa computer mo.)*

### 3. Install dependencies

Isang beses lang ito (o ulitin kapag may bagong library sa `package.json`):

```bash
npm install
```

Hintayin matapos. Minsan may babala (warnings) — okay lang basta walang **ERR** na tumigil sa install.

### 4. Run the development server

```bash
npm run dev
```

Makikita ang URL, hal. `http://localhost:5173`. Buksan sa **Chrome** o **Edge**.

### 5. Optional: production build

```bash
npm run build
npm run preview
```

`preview` ay nagpapakita ng build na parang “live site” locally.

### Requirements (short list)

| Tool | Notes |
|------|--------|
| **Node.js** | LTS recommended (includes `npm`) |
| **Modern browser** | WebGL support for 3D |

**Stack:** React 19, Vite 5, TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, Tailwind.

---

## 3D model asset

- Ang pangunahing modelo ay **`public/machine.fbx`** (tinutukoy ng app bilang static asset).
- Kung walang lumabas na modelo: siguraduhing nandoon ang file, walang typo sa pangalan sa code, at na-refresh ang page pagkatapos magdagdag ng file.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `npm` is not recognized | Install Node.js LTS; restart terminal. |
| `npm install` errors (peer deps) | Gamitin ang parehong Node LTS; kung may specific error message, basahin — minsan kailangan `npm install --legacy-peer-deps` (tanungin ang instructor bago gamitin). |
| Blank / black 3D view | Check browser console (F12); confirm `public/machine.fbx` exists; try another browser; i-click **Reset Camera** sa app. |
| Port already in use | I-stop ang ibang `npm run dev`, o sa Vite: `npx vite --port 5174`. |

---

# Salted Egg Cleaning and Sorting Machine — Full System Analysis

Technical breakdown ng disenyo at ng mga pangalan ng bahagi sa **3D model** (`machine.fbx`). Ang mga **Body** na nakalista ay tumutugma sa mesh/object names sa CAD export — kapaki-pakinabang para sa animation, highlighting, o dokumentasyon.

---

## Design summary

| Metric | Value |
|--------|--------|
| **Total components** | 10 |
| **Total bodies** | 112 |
| **Timeline features** | 448 |
| **Output lanes** | 4 (Small, Medium, Large, Reject) |
| **Cleaning brushes** | 9 |
| **Spray nozzles** | 6 |
| **Sorting pushers** | 4 pairs |
| **Water system** | Closed-loop, filtered |

**Overview:** Fully automated salted egg processing covering **input feeding**, **wet cleaning**, **gravimetric weighing**, **vision-based inspection**, at **multi-lane sorting**, supported by a **recyclable water system**.

---

## 1. Structural frame

Rigid, load-bearing structure para sa lahat ng subsystem. Ang dual-rail layout na may cross-beams ay para sa **industrial stability** at **vibration dampening** — mahalaga habang sabay ang brushes at pumps.

| Body | Role |
|------|------|
| `Base_Slab` | Malaking patag na base; sumusuporta sa lahat ng module |
| `Leg_X*_Y*` (8 legs) | **Structural vertical supports** sa bawat corner position |
| `TopRail_Y0` / `TopRail_Y360` | Longitudinal top rails na nag-uugnay sa mga legs |
| `CrossBeam_X800` / `CrossBeam_X1600` | Lateral cross-beams para sa rigidity sa mid-spans |
| `MidRail_Y0` / `MidRail_Y360` | Mid-height horizontal rails para sa component mounting |
| `FootPad_*` (4 pads) | Anti-vibration / leveling pads sa apat na sulok ng base |

**Function:** Nagbibigay ng matibay na frame para sa buong makina.

---

## 2. Input & conveyor

| Body | Role |
|------|------|
| `Hopper_Bottom`, `Hopper_Rim`, `Hopper_Wall_Left` / `Hopper_Wall_Right` | Funnel hopper para sa raw salted eggs |
| `ConveyorBelt_Platform`, `ConveyorBelt_Surface` | Belt conveyor na nagdadala ng itlog papasok |
| `Roller_Input`, `Roller_Output` | Drive rollers na nagpapatakbo ng belt |

**Function:** Manu-manong niloload ang maruruming itlog sa hopper. Ang conveyor na may dual rollers ay nagpapakain ng kontroladong rate papunta sa **Cleaning Chamber**, para maiwasan ang jam at mapanatili ang spacing.

---

## 3. Cleaning chamber — `CleaningChamber` (25 bodies)

Core cleaning module; pinakakomplikadong subsystem.

| Body group | Bodies | Role |
|------------|--------|------|
| **Chamber walls** | Front, Back, Left, Right, Top | Saradong basang cleaning environment |
| **Brushes** | Left ×4, Right ×4, Top ×1 | Umiikot na brushes para kuskusin ang ibabaw ng itlog |
| **Spray nozzles** | 6 nozzles | High-pressure jets — pre-soak / rinse |
| **Spray pipes** | Top, SideLeft, SideRight | Manifold ng tubig papunta sa nozzles |
| `WaterCollection_Tray` | — | Nagkokolekta ng wastewater |
| `Drain_Outlet` | — | Drain papunta sa recycling / water system |

**Function:** Dumaan ang itlog sa **8 rotating brushes** (4 kaliwa, 4 kanan) at **1 top brush**. Sabay na **6 water nozzles** at **tri-pipe spray layout** (top + dalawang gilid) para sa coverage. Ang tubig ay napupunta sa `WaterCollection_Tray` at `Drain_Outlet` tungo sa **Water Cycling System**.

---

## 4. Weighing station — `WeighingStation` (6 bodies)

Mass measurement stage; **dual-scale** setup.

| Body | Role |
|------|------|
| `Scale_Platform` + `LoadCell_Body` | Unang timbangan (pre-cleaning verification) |
| `Scale_Platform_PostClean` + `LoadCell_Body_PostClean` | Pangalawang timbangan (post-cleaning) |
| `Display_Box` + `Display_Post` | Digital readout para sa weight |

**Function:** Dalawang load cell — bago at pagkatapos ng cleaning. Ang weight data ay ginagamit para sa **Small / Medium / Large** classification at sorting logic.

---

## 5. Vision chamber — `VisionChamber` (14 bodies)

Automated quality inspection station.

| Body | Role |
|------|------|
| 6 enclosure walls | Light-controlled inspection box (madilim na chamber) |
| `Camera_Body`, `Camera_Lens`, `Camera_Cable` | Machine vision camera |
| `LED_Strip_*` (Front / Back / Left / Right) | 4-direction LED para pantay na ilaw |
| `Black_Background_Plate` | High-contrast backdrop para sa image capture |

**Function:** Sa **fully enclosed dark chamber**, 4 LED strips ang nag-iilaw. Kinukuhaan ng camera ang larawan para sa **AI / image processing** — cracks, discoloration, salt deposits, surface defects. Ang black background ay nagpapataas ng contrast.

---

## 6. Sorting mechanism — `SortingMechanism` (21 bodies)

Output classification at physical sorting.

| Body group | Bodies | Role |
|------------|--------|------|
| `Sorting_BasePlatform` | 1 | Main sorting conveyor / track |
| `LaneDivider_1`–`4` | 4 | Lane separators — 4–5 output streams |
| `Lane_*_EndPlate` | 4 | Exit plates: Small, Medium, Large, Reject |
| `Pusher_Actuator_1`–`4` | 4 | Linear actuators (pneumatic / electric) |
| `Pusher_Arm_1`–`4` | 4 | Arms na humihiwalay ng itlog sa lane |
| `Servo_Motor_1`–`4` | 4 | Servo para sa timing ng pushers |

**Function:** Batay sa weight at vision data, **4 servo-driven pusher pairs** ang nagdi-divert ng itlog sa:

- **Lane Small** → maliit  
- **Lane Medium** → medium  
- **Lane Large** → malaki  
- **Lane Reject** → cracked / damaged / contaminated  

---

## 7. Water cycling system — `WaterCyclingSystem` (16 bodies)

Closed-loop water management.

| Body group | Bodies | Role |
|------------|--------|------|
| **Tank** (5 walls + bottom + rim) | 6 | Reservoir ng recycled cleaning water |
| `Filter_Shell`, `Filter_Cover`, `Filter_Mesh` | 3 | Filtration — debris / particles |
| `Pump_Body`, `Pump_Motor`, `Pump_Impeller` | 3 | Circulation pump |
| `Pipe_VerticalRiser`, `Pipe_ToFilter`, `Pipe_DrainReturn` | 3 | Plumbing network |
| `WaterLevel_SightGlass` | 1 | Visual water level |

**Function:** Ang maruming tubig mula sa cleaning chamber ay pumupunta sa tank, dadaan sa mesh filter (egg shell debris, salt particles), tapos ibinabalik ng pump sa spray nozzles (vertical riser). **Closed-loop** — bawas waste at operating cost.

---

## 8. Egg size reference models (3 bodies)

| Component | Role |
|-----------|------|
| `Egg_Small:1` | Reference geometry — small egg |
| `Egg_Medium:1` | Reference geometry — medium egg |
| `Egg_Large:1` | Reference geometry — large egg |

**Function:** Design references para sa clearances, lane widths, hopper opening, at brush spacing.

---

## Complete workflow summary

1. **Raw eggs** → **Hopper (input)**  
2. → **Conveyor belt**  
3. → **Cleaning chamber** (brushes + spray nozzles)  
4. → **Weighing station** (load cell classification)  
5. → **Vision chamber** (camera defect detection)  
6. → **Sorting mechanism** (servo + pusher → 4 lanes)  
7. → **Small / Medium / Large / Reject** outputs  

**Auxiliary:** **Water recycled** — pump → filter → tank → nozzles (closed loop).

---

## Simulator vs. real machine

Ang web simulator ay **naka-simplify**: linear stage flow, procedural egg sphere, at tuning ng `STATION_X` / camera. Ang **Full System Analysis** sa itaas ay naglalarawan ng **tunay na disenyo** at **FBX part names**; maaari itong gamitin bilang gabay kapag nagdadagdag kayo ng mas detalyadong animation o logic.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development server |
| `npm run build` | Production build sa `dist/` |
| `npm run preview` | Preview ng production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |

---

## License

Private / educational project — i-align ang license sa policy ng inyong school o group.
