#!/usr/bin/env bash
# Builds local test media in tests/site (needs ffmpeg). Run from the tests/ folder.
set -e
rm -rf site && mkdir -p site/hls && cd site
ffmpeg -loglevel error -y -f lavfi -i testsrc=size=640x360:rate=25 -f lavfi -i sine=frequency=440 -t 6 -c:v libx264 -g 50 -pix_fmt yuv420p -c:a aac -shortest test.mp4
ffmpeg -loglevel error -y -f lavfi -i testsrc=size=320x180:rate=25 -f lavfi -i sine=frequency=440 -t 600 -c:v libx264 -preset ultrafast -g 50 -pix_fmt yuv420p -c:a aac -shortest long.mp4

# HLS: AES-128 encrypted TS variant + fMP4 variant + master
head -c 16 /dev/urandom > hls/k.bin && printf 'k.bin\nhls/k.bin\n' > keyinfo
ffmpeg -loglevel error -y -i long.mp4 -c copy -hls_time 2 -hls_playlist_type vod -hls_key_info_file keyinfo hls/hi.m3u8
ffmpeg -loglevel error -y -i long.mp4 -c copy -hls_time 2 -hls_playlist_type vod -hls_segment_type fmp4 -hls_fmp4_init_filename lo_init.mp4 -hls_segment_filename 'hls/lo_%d.m4s' hls/lo.m3u8
printf '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720\nhi.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\nlo.m3u8\n' > hls/master.m3u8
cat > index.html <<'H'
<!doctype html><title>Test Video Page</title><video src="test.mp4" controls autoplay muted></video>
<script>fetch('hls/master.m3u8').then(r=>r.text()).then(()=>fetch('hls/hi.m3u8'));</script>
H

# Vimeo-style playlist.json (separate fMP4 video/audio tracks)
mkdir -p vm/d && (cd vm/d && ffmpeg -loglevel error -y -i ../../long.mp4 -map 0:v -map 0:a -c copy -f dash -seg_duration 6 -use_template 1 -use_timeline 0 -init_seg_name 'init-$RepresentationID$.m4s' -media_seg_name 'seg-$RepresentationID$-$Number$.m4s' out.mpd)
D='vm/exp=abc~hmac=x'
mkdir -p "$D/v2/playlist/av/primary" "$D/parcel/video/v1" "$D/parcel/audio/a1"
for f in vm/d/seg-0-*.m4s; do n=${f##*-}; mv "$f" "$D/parcel/video/v1/segment-${n%.m4s}.mp4"; done
for f in vm/d/seg-1-*.m4s; do n=${f##*-}; mv "$f" "$D/parcel/audio/a1/segment-${n%.m4s}.mp4"; done
python3 - <<'P'
import base64, os, json
d='vm/exp=abc~hmac=x'
def segs(p):
    n=len([f for f in os.listdir(f'{d}/parcel/{p}') if f.startswith('segment-')])
    return [{"start": (i-1)*6.0, "end": i*6.0, "url": f"segment-{i}.mp4"} for i in range(1,n+1)]
init=lambda f: base64.b64encode(open(f'vm/d/{f}','rb').read()).decode()
j={"clip_id":"t","base_url":"../../../../parcel/","duration":600,
   "video":[{"id":"v1","base_url":"video/v1/","width":320,"height":180,"bitrate":300000,"init_segment":init('init-0.m4s'),"segments":segs('video/v1')},
            {"id":"v0","base_url":"video/v1/","width":160,"height":90,"bitrate":100000,"init_segment":init('init-0.m4s'),"segments":segs('video/v1')}],
   "audio":[{"id":"a1","base_url":"audio/a1/","bitrate":128000,"init_segment":init('init-1.m4s'),"segments":segs('audio/a1')}]}
json.dump(j,open(f'{d}/v2/playlist/av/primary/playlist.json','w'))
P
cat > vimeo.html <<'H'
<!doctype html><title>Vimeo Test Page</title><h1>vimeo test</h1>
<script>
const m='vm/exp=abc~hmac=x/v2/playlist/av/primary/playlist.json?pathsig=zzz';
fetch(m).then(r=>r.json()).then(async()=>{ for (const u of ['vm/exp=abc~hmac=x/parcel/video/v1/segment-1.mp4','vm/exp=abc~hmac=x/parcel/audio/a1/segment-1.mp4']) await fetch(u); });
</script>
H

# Vimeo-style split HLS (…/avf/<id>/media.m3u8?st=video|audio), served as vod-adaptive-ak.vimeocdn.com
B=vh/exp=1~hmac=2/abc/psid=3/v2/playlist/av/a749/avf
mkdir -p $B/vid1 $B/aud1
ffmpeg -loglevel error -y -i long.mp4 -map 0:v -c copy -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type fmp4 -hls_fmp4_init_filename init.mp4 -hls_segment_filename "$B/vid1/seg%d.m4s" $B/vid1/media.m3u8
ffmpeg -loglevel error -y -i long.mp4 -map 0:a -c copy -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type fmp4 -hls_fmp4_init_filename init.mp4 -hls_segment_filename "$B/aud1/seg%d.m4s" $B/aud1/media.m3u8
cat > vhls.html <<H
<!doctype html><title>Vimeo HLS Test</title><h1>vimeo hls</h1>
<script>
const H='http://vod-adaptive-ak.vimeocdn.com:8123/$B/';
fetch(H+'vid1/media.m3u8?pathsig=a&st=video').catch(()=>{}).then(()=>fetch(H+'aud1/media.m3u8?pathsig=a&st=audio').catch(()=>{}));
</script>
H
# Real Vimeo player: master playlist + several qualities (ABR) + audio — must show as ONE item.
mkdir -p $B/vid2 && cp $B/vid1/* $B/vid2/
cat > $B/../playlist.m3u8 <<M
#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="a",DEFAULT=YES,URI="avf/aud1/media.m3u8?pathsig=a&st=audio"
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=320x180,AUDIO="aud"
avf/vid1/media.m3u8?pathsig=a&st=video
#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=160x90,AUDIO="aud"
avf/vid2/media.m3u8?pathsig=a&st=video
M
# Player reloads the master with a new playback session (psid=…) → still the same video.
ln -s psid=3 vh/exp=1~hmac=2/abc/psid=4
cat > vhls4.html <<H
<!doctype html><title>Vimeo ABR Test</title><h1>vimeo abr</h1>
<script>
const H='http://vod-adaptive-ak.vimeocdn.com:8123/$B/';
(async () => { for (const u of ['../playlist.m3u8?pathsig=a', '../../../../../../psid=4/v2/playlist/av/a749/playlist.m3u8?omit=opus', 'vid2/media.m3u8?pathsig=a&st=video&r=1', 'aud1/media.m3u8?pathsig=a&st=audio&r=1', 'vid1/media.m3u8?pathsig=a&st=video&r=2'])
  await fetch(H+u).catch(()=>{}); })();
</script>
H
echo "fixtures ready"
