"""Transcode recorded browser footage without changing its playback speed."""
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
clips = []
(root / 'remotion/public/real-2026').mkdir(parents=True, exist_ok=True)
for name in ['integral', 'fraction', 'matrix', 'commands', 'style']:
    source = root / 'recorder/raw/real-2026' / f'promo_{name}.webm'
    output = root / 'remotion/public/real-2026' / f'{name}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source), '-c:v', 'libx264',
                    '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-an', '-y', str(output)], check=True)
    duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                      'format=duration', '-of', 'csv=p=0', str(output)]))
    clips.append({'name': name, 'frames': round(duration * 25),
                  'events': json.loads(source.with_suffix('.json').read_text())['events']})
(root / 'remotion/src/real-2026.json').write_text(json.dumps(clips, indent=2))
