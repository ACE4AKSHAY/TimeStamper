# Runtime compatibility and optimization check

The reusable alignment core is intentionally plain ES modules. Browser and
future mobile clients can import the core modules without Electron or Node
APIs; Node-only decoding and project storage remain in their adapter modules.

`npm run check-compatibility` verifies that:

- `package.json` remains ESM and declares Node `>=18`;
- every reusable core module imports successfully;
- portable modules do not contain `node:` imports or CommonJS Node requires;
- a Unicode, monotonic alignment smoke case succeeds;
- a 1,200-frame profile exercises the optimized numeric paths.

The check runs with the configured NVM Node 22 runtime here. Node 18 is the
declared floor, but is not installed on this machine, so the check cannot claim
to execute a second Node version until one is provisioned.

The optimization pass also removes repeated prefix reductions from the energy
baseline and spread-based min/max operations from profile normalization. This
reduces avoidable work and avoids argument-size limits on long audio profiles
without changing the public API.
