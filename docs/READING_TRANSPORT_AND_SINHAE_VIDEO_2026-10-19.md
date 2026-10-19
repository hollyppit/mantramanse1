# Reading transport recovery and Sinhae female video

## Transport recovery

Retry transient transport failures at most twice, preserving the request body.
Recover from gateway HTML, truncated JSON, network errors and explicit temporary
storage/in-progress responses. Do not retry evidence, quality, cost or rate-limit
rejections. Session cancellation and the existing request deadline remain in force.

The original chapter 17 upstream fault could not be identified from durable logs.
The confirmed client defect was treating a non-JSON response as terminal without
automatic recovery. This change repairs that handling, not an established upstream
gateway defect.

Local regression: `node tests/reading-transport-recovery-sim.cjs` (mock-only; no AI
or production calls). Production UI after deployment completed chapter 17 without
manual regeneration, both directly and after chapters 15 and 16. No production
fault was artificially injected.

Deployment: `a627ec0e-b2be-4ba1-8dc7-3aa6924b3b56`.

## Existing-image video

With user approval, the existing female Sinhae illustration was converted into an
8-second, 720x1280 H.264 video with a gentle looping zoom. No generative AI was used.
Only the `신해` / `F` entry was added to `awakening:index`; other video and ilgan
entries were preserved. Other unfinished day-pillar videos remain unregistered.

- Video: `/api/clipfile?k=ilju-sinhae-F-motion-b210fd13f636832c.mp4`
- Poster: `/api/clipfile?k=ilju-sinhae-F-motion-6c6ec681d7d8650c.jpg`
- Video SHA-256 prefix: `b210fd13f636832c`

Verified in the production reading body as `일주 캐릭터 영상`: readyState 4,
playing time advanced, duration 8 seconds, dimensions 720x1280, no video error.
The ilgan introduction remains a separate video. An unregistered Sinhae male
lookup still returns no day-pillar video or generic fallback.

Media is stored in the existing production R2 bucket; private configuration
backups, credentials and binary output are not committed.
