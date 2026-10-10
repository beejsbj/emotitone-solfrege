# BJS-486 effect references

The first commit freezes the installed superdough 1.3.0 effects before changing
production audio. `fixtures/reference.json` holds little-endian float32 PCM as
base64, the checkout revision, Chrome version and dependency hashes.

Regenerate deliberately (requires `/usr/bin/google-chrome`, or `CHROME_BIN`):

```sh
REGENERATE_EFFECT_GOLDENS=1 bun run test:run audio-lab/reference/effectGoldens.test.ts
```

The capture uses superdough's real `createFilter` and orbit effect nodes in
OfflineAudioContext, with no network sample downloads. Filter impulses cover
200/1,000/5,000 Hz, native Q=1 (Shape resonance zero) and Q=10 at 44.1/48 kHz.
Filter sources remain active with zero padding so native tail-pruning does not
truncate the reference. The initial one-frame-source captures remain in the
first fixture commit; the next commit corrects their source lifetime.

Delay uses send 0.6, 250 ms and feedback 0.3, with an impulse at 50 ms. Room uses
the default unseeded stereo IR; compare its spectrum and decay, not individual
noise samples. Capture closes its isolated Chrome and Vite server in `finally`.
