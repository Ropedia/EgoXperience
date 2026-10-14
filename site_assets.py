"""Inventory the complete self-contained runtime assets of the current site."""
import json
from pathlib import Path

def runtime_files(root):
    root = Path(root).resolve()
    assets = root / 'assets-v2'
    # Public provenance for the training-composition panel.
    files = {Path(n) for n in ['index.html', 'v2.css', 'v2.js', 'data-player.js', 'sequence-viewer.js', 'metrics.js', '.nojekyll']}
    for directory in ['vendor', 'assets-v2/fonts']:
        files.update(p.relative_to(root) for p in (root / directory).rglob('*') if p.is_file())
    for n in ['tasks.json', 'model-tasks.json', 'caption-asr-audit.json', 'model-training-audit.json', 'institution-logo-sources.json', 'x-hd.png', 'logo-ropedia.png', 'logo-ntu.png', 'logo-tsinghua-purple.jpg', 'logo-pku-horizontal.png', 'engine/pipeline.svg', 'engine/neural-network.svg', 'engine/product-source.json', 'engine/homie-gen2-product.png', 'wall/manifest.json']:
        files.add(Path('assets-v2') / n)
    for item in json.loads((assets / 'wall/manifest.json').read_text()):
        files.update(Path(item[k]) for k in ['video', 'poster'])
    for kind, catalog in [('data', 'tasks.json'), ('model', 'model-tasks.json')]:
        items = json.loads((assets / catalog).read_text())
        assert len(items) == 12
        for item in items:
            base = Path('assets-v2') / (kind + '-' + item['id'])
            scene = json.loads((root / base / 'scene.json').read_text())
            files.update(base / n for n in ['scene.json', 'poster.jpg'])
            if kind == 'data':
                for name in ['raw', 'depth', 'mask', 'object-pose', 'hands', 'mesh', 'camera']:
                    files.add(base / (name + '.mp4'))
                    if name != 'raw':
                        files.add(base / (name + '.jpg'))
                files.add(base / 'camera-render.json')
            else:
                files.update(base / n for n in ['left-faces.bin', 'right-faces.bin', 'stream.json'])
                for key in ['rgb', 'depth', 'mask', 'mesh']:
                    if scene.get(key):
                        files.add((root / base / scene[key]).resolve().relative_to(root))
                manifest = json.loads((root / base / 'stream.json').read_text())
                files.update(base / c['file'] for c in manifest['chunks'])
    files.add(Path('assets-v2/training-data-summary.json'))
    return files

if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    files = runtime_files(root)
    missing = [str(p) for p in files if not (root / p).is_file()]
    assert not missing, missing
    sizes = [(root / p).stat().st_size for p in files]
    assert max(sizes) < 100 * 1024**2, 'Asset exceeds GitHub single-file limit'
    assert sum(sizes) < 1000 * 1024**2, 'Site exceeds Pages size limit'
    print(f'{len(files)} runtime files; {sum(sizes):,} bytes; largest {max(sizes):,} bytes; no missing assets')
