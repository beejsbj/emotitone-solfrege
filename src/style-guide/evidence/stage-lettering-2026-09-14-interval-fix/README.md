# Interval collision regression

Local production captures at 390×844 and 1366×900 (Chrome, device scale 2).
Synthetic held E4 then C4 reproduce the long emotion phrase from the reported
phone view. The `-3M` interval now moves around the occupied emotion bounds,
with a subtle leader back to its original anchor.

Two regression cases (centred and near-centred interval anchors) failed before
the fix and pass afterward. The focused typography and geometry suites pass
17 tests. These are local browser captures, not physical-device or hosted
deployment verification.
