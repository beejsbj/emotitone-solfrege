#!/bin/bash
# Auto-continue Claude Code session for emotitone-solfrege
# Scheduled at 2:01 AM to resume work after context limit resets

cd /Users/burooj/Projects/emotitone-solfrege

/Users/burooj/.bun/bin/claude --continue --dangerously-skip-permissions -p "Continue working on the emotitone-solfrege project. Check MEMORY.md and recent git log for context. Key pending work: (1) Tone.js → superdough migration for live notes - check if src/services/superdoughAudio.ts was created by a background agent, (2) verify type-check passes, (3) commit any uncommitted changes. Run bun run type-check first to assess current state." 2>&1 | tee -a /tmp/claude-emotitone-continue.log
