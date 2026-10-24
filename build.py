"""Build the single-file HTML needed by Apps Script (no dependencies)."""
from pathlib import Path
import hashlib
import re

root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'style.css').read_text(encoding='utf-8')
js = (root / 'script.js').read_text(encoding='utf-8')
css_version = hashlib.sha256(css.encode()).hexdigest()[:12]
js_version = hashlib.sha256(js.encode()).hexdigest()[:12]
html = re.sub(r'href="style\.css(?:\?v=[^"]*)?"', 'href="style.css?v=' + css_version + '"', html)
html = re.sub(r'src="script\.js(?:\?v=[^"]*)?"', 'src="script.js?v=' + js_version + '"', html)
(root / 'index.html').write_text(html, encoding='utf-8')
import base64
logo = base64.b64encode((root / 'assets' / 'sports-centre-logo.svg').read_bytes()).decode('ascii')
html = html.replace('src="assets/sports-centre-logo.svg"', 'src="data:image/svg+xml;base64,' + logo + '"')
html = html.replace('<link rel="stylesheet" href="style.css?v=' + css_version + '">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="script.js?v=' + js_version + '"></script>', '<script>\n' + js + '\n</script>')
(root / 'App.html').write_text(html, encoding='utf-8')
print('Built App.html. Paste its entire contents into the Apps Script HTML file named App.')
