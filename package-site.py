"""Package exactly the current runtime assets without external downloads."""
import shutil
from pathlib import Path
from site_assets import runtime_files

root = Path(__file__).resolve().parent
out = root / 'dist'
if out.exists():
    raise SystemExit('dist already exists; move it aside before packaging again')
files = runtime_files(root)
missing = [str(p) for p in files if not (root / p).is_file()]
assert not missing, missing
for path in sorted(files):
    (out / path).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / path, out / path)
print('Pages artifact bytes:', sum((out / p).stat().st_size for p in files))
