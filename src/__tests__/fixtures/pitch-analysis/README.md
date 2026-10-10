# Melograph loudness capture

`melograph-two-level-sine.json` is the complete, unedited response captured on
2026-10-10 from `POST https://melograph-swart.vercel.app/api/analyze`, with
`Content-Type: audio/wav`.

Input: a two-second mono 16-bit PCM WAV at 22,050 Hz. Sample `i` is
`round(32767 * amplitude * sin(2 * pi * 261.625565 * i / 22050))`, with amplitude
0.01 for the first second and 0.05 for the second. No microphone audio is used.

Voiced frames away from the amplitude transition report `rms_db` around −43.02
and −29.03 respectively. These match `20 * log10(amplitude / sqrt(2))`, confirming
amplitude dBFS for the deployed `praat-ac` tracker, rather than positive Praat
intensity. Both detected C4 events have confidence 1 but different energy.
