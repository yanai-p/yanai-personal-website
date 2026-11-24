"""Rebuild the Hero from the owner's originals, never the previous 24fps files.

Sources are 30000/1001 and 30fps. 60fps output uses motion-compensated
interpolation, not frame duplication. Interpolate each shot BEFORE dissolving.
Run from the repository root; requires imageio_ffmpeg.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import subprocess
import sys
import time
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'research/hero-60fps'
OUT = ROOT / 'yanai-site/dist/assets'
FF = imageio_ffmpeg.get_ffmpeg_exe()
SOURCES = [
    Path('C:/Users/Ariel/OneDrive - Meylon/Desktop/dji_fly_20260629_095352_428_1782716958540_video.mp4'),
    Path('C:/Users/Ariel/OneDrive - Meylon/Desktop/67454.mp4'),
]
# The DJI container says 18s because of its telemetry stream. The actual video
# is 517 frames at 30000/1001 = 17.25057s. Do not freeze its tail to reach 18s.
FRAMES = [1035, 1076]
FPS = 60
FADE = 45
LOOP_FRAMES = sum(FRAMES) - FADE * 2


def run(args, log):
    with log.open('w', encoding='utf-8') as stream:
        subprocess.run([FF, '-y', '-hide_banner', '-nostdin', '-threads', '4',
                        *args], stdout=stream, stderr=stream, check=True)


def interpolate(index):
    target = WORK / f'source-{index + 1}-60fps.mp4'
    if '--reuse-intermediates' in sys.argv and target.exists():
        return target
    # A short tail supplies the temporal filter's look-ahead; trim to source length.
    filters = (
        'scale=1600:900:flags=lanczos,setsar=1,setpts=PTS-STARTPTS,'
        'tpad=stop_mode=clone:stop_duration=0.1,'
        'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,'
        f'trim=end_frame={FRAMES[index]},setpts=N/(60*TB),format=yuv420p'
    )
    run(['-i', str(SOURCES[index]), '-filter_threads', '2', '-vf', filters,
         '-an', '-sn', '-dn', '-c:v', 'libx264', '-threads', '4',
         '-preset', 'medium', '-crf', '16', '-fps_mode', 'cfr',
         '-map_metadata', '-1', str(target)], WORK / f'interpolate-{index+1}.log')
    print(f'Source {index+1}: motion interpolation complete', flush=True)
    return target


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=2) as pool:
        clips = list(pool.map(interpolate, range(2)))
    report = {'source_fps': ['30000/1001', '30'], 'output_fps': FPS,
              'interpolation': 'motion compensated, aobmc/bidir/vsbmc',
              'loop_frames': LOOP_FRAMES, 'outputs': []}
    # Bound transfer rate for the public preview while preserving 60fps motion.
    for suffix, width, crf, rate, buf in [('', 1280, 24, '2200k', '4400k'),
                                        ('-mobile', 720, 26, '850k', '1700k')]:
        graph = (
            f'[0:v]trim=end_frame={FRAMES[0]},scale={width}:-2:flags=lanczos,settb=1/60,setpts=N,split[a][head];'
            f'[head]trim=end_frame={FADE},setpts=PTS-STARTPTS[opening];'
            f'[1:v]trim=end_frame={FRAMES[1]},scale={width}:-2:flags=lanczos,settb=1/60,setpts=N[b];'
            f'[a][b]xfade=transition=fade:duration=0.75:offset={(FRAMES[0]-FADE)/FPS}[ab];'
            f'[ab][opening]xfade=transition=fade:duration=0.75:offset={LOOP_FRAMES/FPS:.9f},'
            f'trim=start_frame={FADE}:end_frame={LOOP_FRAMES+FADE},'
            'setpts=N/(60*TB),format=yuv420p[out]'
        )
        target = OUT / f'yanai-hero-sites-60fps-web{suffix}.mp4'
        run(['-i', str(clips[0]), '-i', str(clips[1]), '-filter_complex_threads', '2',
             '-filter_complex', graph, '-map', '[out]', '-an', '-c:v', 'libx264',
             '-threads', '4', '-preset', 'slow', '-crf', str(crf), '-maxrate', rate,
             '-bufsize', buf, '-g', '120', '-fps_mode', 'cfr', '-movflags', '+faststart',
             '-map_metadata', '-1', str(target)], WORK / f'encode{suffix}.log')
        # Full decode and per-frame timestamps/hashes, not just container metadata.
        hashes = subprocess.run([FF, '-v', 'error', '-i', str(target), '-map', '0:v:0',
                                 '-f', 'framemd5', '-'], capture_output=True, check=True,
                                text=True).stdout
        (WORK / f'frames{suffix}.md5').write_text(hashes)
        rows = [line.split(',') for line in hashes.splitlines() if not line.startswith('#')]
        assert len(rows) == LOOP_FRAMES, (target, len(rows), LOOP_FRAMES)
        assert '#tb 0: 1/60' in hashes
        assert [int(row[2]) for row in rows] == list(range(LOOP_FRAMES))
        duplicates = [i for i in range(1, len(rows)) if rows[i][-1] == rows[i-1][-1]]
        assert len(duplicates) < 10, f'Unexpected duplicate frames: {duplicates}'
        data = target.read_bytes()
        assert data.index(b'moov') < data.index(b'mdat'), 'Missing faststart'
        report['outputs'].append({'file': target.name, 'bytes': len(data),
                                  'width': width, 'frames': len(rows),
                                  'adjacent_duplicate_frames': duplicates})
        print(f'{target.name}: {len(data):,} bytes; {len(rows)} frames at 60fps; '
              f'{len(duplicates)} adjacent duplicates', flush=True)
    report['elapsed_seconds'] = round(time.monotonic() - started, 1)
    (WORK / 'validation.json').write_text(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
