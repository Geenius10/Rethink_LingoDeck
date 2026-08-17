# ReThink. Athletic Lab — v48 Design Lab (TESTBRANCH)

> **Wichtig:** Diese Version ist ein reines Design-Experiment auf Basis von v47 und **kein neuer Standard**. Die Trainings-, Plan-, Draft-, Workout- und Storage-Logik bleibt auf dem funktionalen Stand von v47.

## Technischer Stand
- PWA mit 5 Haupt-Tabs: Übungen, Pläne, Training, Woche, Profil
- Vanilla JavaScript in `index.html`
- `manifest.webmanifest` für Installation/PWA-Metadaten
- `sw.js` als Service Worker
- lokale Persistenz über die bestehenden LocalStorage-Schlüssel
- bestehende Pläne, eigene Übungen, Verlauf, aktive Workouts, Messungen, Ernährung und Profil bleiben kompatibel

## Funktionaler Stand v47
- einheitliche „Übung hinzufügen“-Maske für Hinzufügen, Bearbeiten und Austauschen
- Draft/Validierung vor dem Übernehmen einer Übung
- universelle Umwandlung zwischen Satzmethoden
- Zeit und AMRAP sind Tracking-/Ausführungsformen und **keine** Satzmethoden
- Superset, Giant Set und Pre-Exhaust behalten pro Mitglied eigenen WDH-/Zeit-/AMRAP-Modus
- Pyramide nur auf WDH, mindestens 3 Sätze, auf- oder absteigend konfigurierbar und dynamische Folge-WDH
- methodenabhängige sinnvolle Satzanzahlen
- Planänderungen außerhalb eines Workouts werden beim Verlassen einmal zum Speichern/Verwerfen angeboten
- Workout-Strukturänderungen bleiben zunächst im Workout; erst beim regulären Abschluss Entscheidung über Originalplan / neuen Plan / Verwerfen
- Gruppen bleiben bei Reihenfolge und Darstellung zusammenhängend
- Vorschau read-only; Verlauf speichert Workout-Snapshots

## v48 Design Lab — ausschließlich visuell
Das Design wurde testweise vollständig neu interpretiert:
- Midnight-/Graphite-Grundfläche mit Lilac-/Ice-Akzenten
- weichere Glassurfaces und stärkere Tiefenstaffelung
- schwebende, pillenartige Bottom-Navigation
- größere typografische Hierarchie und editorialere Überschriften
- neue Kartenradien, Abstände, Button- und Input-Sprache
- Trainingsmethoden mit schmalem farbigem Methoden-Rail statt dominanter Vollumrandung
- überarbeitete visuelle Behandlung von Live-Workout, Pausentimer, Wochenplan und Profilkarten
- keine Storage-Keys, Datenmodelle oder Trainingslogik für diesen Design-Test verändert

## Persistenz / Kompatibilität
Die bestehenden Storage-Schlüssel bleiben unverändert. Diese Testversion kann deshalb dieselben gespeicherten Daten wie v47 auf derselben Domain verwenden.
