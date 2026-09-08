# Submission

## Assumptions

- Empty or whitespace-only `material` values are normalized to `null`.
- Missing `budget` values are stored as `null`, while `0` remains a valid value.
- Client-provided `status` is rejected rather than ignored.
- `cross-env` is used for `db:reset` so `RUST_LOG=info` works consistently across platforms.
- The Vite dev proxy uses `127.0.0.1` to avoid IPv6 `localhost` resolution issues on Windows.

## AI usage

- I used ChatGPT to help write the test cases, which I then reviewed and verified myself. 
- Since Prisma was new to me, I also used ChatGPT as a learning and reference tool to better understand Prisma models, relations, migrations, and queries.

## Verification

- I carefully verified the AI-assisted test cases by reviewing each case and running the full test suite. 
- I also manually tested the main flow: extraction, editing, saving a lead, and changing its status in the pipeline.
