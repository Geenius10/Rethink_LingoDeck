# Nihongo Cards PWA

Installierbare, offlinefähige Japanisch-Lernapp.

## Enthalten

- echte Progressive Web App
- `manifest.webmanifest`
- Service Worker mit Offline-App-Shell
- 192×192- und 512×512-App-Icons
- Apple-Touch-Icon
- installierbar auf iPhone/iPad/Android/Desktop
- Update-Erkennung
- lokale Datenspeicherung
- Export/Import des Lernstands
- Spaced Repetition
- Schwächen-Gewichtung
- Tagesziel und neue Karten pro Tag
- Hiragana und Katakana inkl. Dakuten/Yōon
- JLPT-Struktur N5 bis N1
- Vokabeln, Grammatik und Kanji nach Niveau
- Quiz
- Hörtraining via japanischer Systemstimme
- Schreibtraining
- Schwächen-Training
- Verbformen
- japanische Zähler
- Verwechslungs-Kana
- eigene Karten

## Installation / lokaler Test

Ein Service Worker funktioniert nicht zuverlässig über `file://`.
Starte deshalb einen lokalen Webserver:

```bash
python3 -m http.server 8000
```

Dann im Browser öffnen:

```text
http://localhost:8000/Nihongo_Cards_PWA/
```

Für die Installation auf iPhone/iPad:
1. App über HTTPS bereitstellen.
2. In Safari öffnen.
3. Teilen → „Zum Home-Bildschirm“.

Auf unterstützten Android-/Desktop-Browsern erscheint zusätzlich ein Installationsbutton.

## Struktur

- `index.html` – App-Oberfläche
- `assets/styles.css` – Design
- `assets/app.js` – App-Logik
- `data/data.js` – Lerninhalte
- `manifest.webmanifest` – PWA-Metadaten
- `service-worker.js` – Offline-Cache
- `icons/` – App-Icons

## Inhaltliche Architektur

Die App ist so gebaut, dass die Daten in `data/data.js` modular erweitert werden können. N5–N1 ist bereits in Navigation und Filterung vorgesehen. Die aktuelle Version enthält einen substanziellen Starterbestand, aber nicht die vollständigen offiziellen Wortschatzbestände aller JLPT-Stufen; der JLPT veröffentlicht selbst keine verbindliche komplette Vokabelliste. Eigene oder lizenzierte Datensätze können später ergänzt werden.


## Neu in v4

- freundlicheres, weicheres Farbsystem
- Hellmodus und Dunkelmodus
- Designwahl wird gespeichert
- Inhaltsversion (`CONTENT_VERSION`) vom Lernstand getrennt
- modulare Datenstruktur vorbereitet (`data/content-manifest.json`)
- separate Moduldateien für Kana, Vokabeln, Grammatik, Kanji, Verben, Zähler und Verwechslungsübungen
- Service-Worker-Cache auf v4 aktualisiert

### Wichtig zur Datenmigration

Der bestehende Lernstand liegt weiterhin separat in `localStorage`. Dadurch können die Lerninhalte später erweitert oder ersetzt werden, ohne dass Bewertungen, Streaks und Wiederholungsintervalle gelöscht werden müssen.

In dieser Version läuft der aktuelle Inhaltsbestand aus Kompatibilitätsgründen noch über `data/data.js`; die neuen JSON-Module sind bereits als saubere Zielstruktur angelegt. Der nächste Ausbau kann die Inhalte modulweise dorthin verschieben, ohne das UI erneut umzubauen.


## Neu in v5

- N5-Wortschatz deutlich erweitert
- 20 strukturierte N5-Grammatiklektionen
- Beispielsätze und Merkhilfen
- Zahlen & Uhrzeit als eigenes Modul
- bestehende Verbformen, Zähler und Kana-Verwechslungsübungen weiter integriert
- Inhaltsversion auf 5.0.0 angehoben
- bestehender Lernstand bleibt getrennt von den neuen Inhalten erhalten

Die App ist weiterhin offlinefähig und installierbar.


## Neu in v6 – N4 integriert

- großer N4-Wortschatzblock ergänzt
- umfangreicher N4-Kanji-Bestand ergänzt
- 50+ N4-Grammatikkarten
- 35 strukturierte N4-Grammatiklektionen mit Erklärung, Beispielen und Merkhilfen
- N4 lässt sich direkt als aktives Niveau wählen
- Lernpfad zeigt N4-Fortschritt separat
- Quiz, Hören, Schreiben, Karteikarten und Schwächen-Training berücksichtigen das gewählte Niveau
- bestehender Lernstand bleibt erhalten
- Inhaltsversion: 6.0.0

Hinweis: Der JLPT veröffentlicht keine verbindliche offizielle vollständige Wortschatz- oder Kanji-Liste pro Stufe. „Komplett integriert“ bedeutet hier, dass N4 als vollständiger Lernbereich in der App-Architektur vorhanden ist und mit einem sehr breiten, prüfungsnahen Starterkorpus gefüllt wurde.
