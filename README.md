# Campus Suite (flat version - all files in one folder)

Open `index.html` (double-click, or VS Code Live Server). Two cards:
- Smart Room System -> room.html
- Attendance Intelligence -> attendance.html

Files:
- index.html        landing page (electric border cards)
- attendance.html   Attendance Intelligence (single file app)
- room.html         Smart Room Finder page
- room-styles.css, room-app.js, room-engine.js, room-three-view.js, room-splash-fx.js, room-data.js
- three.min.js, OrbitControls.js   3D engine (bundled offline)
- room-timetable.normalized.json, room-build_dataset.py   data source + generator (run: python room-build_dataset.py)

Keep every file in the same folder. Each app has a Home button back to index.html.
