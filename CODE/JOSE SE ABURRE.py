#!/usr/bin/env python3
import webbrowser
from pathlib import Path

script_dir = Path(__file__).resolve().parent
html_path = script_dir / "JOSE SE ABURRE.html"

if not html_path.exists():
    raise SystemExit(f"No se encontró el archivo de juego: {html_path}")

print(f"Abriendo el juego en tu navegador: {html_path}")
try:
    webbrowser.open(html_path.resolve().as_uri())
    print("Listo. Si el navegador no se abrió, abre el archivo manualmente.")
except Exception as exc:
    print(f"No se pudo abrir automáticamente el navegador: {exc}")
    print(f"Puedes abrir manualmente este archivo: {html_path}")
