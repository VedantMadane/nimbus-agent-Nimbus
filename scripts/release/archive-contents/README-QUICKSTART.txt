Nimbus Headless — Quickstart
============================

This archive contains the Nimbus headless Gateway and CLI binaries plus
small per-OS install/uninstall scripts that put `nimbus` on your PATH.

Contents:
  nimbus                     The CLI client (nimbus.exe on Windows).
  nimbus-gateway             The long-running Gateway daemon (.exe on Windows).
  install.sh / install.ps1   Per-user installer (no admin, no sudo). Copies
                             the two binaries to a per-user directory and
                             adds it to your PATH so a new shell can run
                             `nimbus`.
  uninstall.sh / uninstall.ps1   Reverses install: removes the binaries and
                                 the PATH entry the installer added.
  README-QUICKSTART.txt      This file.
  LICENSE-AGPL.txt           AGPL-3.0 license (full text).

Getting started (macOS / Linux):
  1. Extract this archive.
  2. cd into the extracted directory.
  3. ./install.sh --yes
  4. Open a NEW shell so PATH refreshes, then:
       nimbus start    # spawn the Gateway as a managed background process
       nimbus status   # confirm it's running
       nimbus --help

Getting started (Windows):
  1. Right-click the .zip → "Extract All".
  2. Open a PowerShell window in the extracted directory.
  3. .\install.ps1 -Yes
  4. Open a NEW PowerShell window so PATH refreshes, then:
       nimbus start    # spawn the Gateway as a managed background process
       nimbus status   # confirm it's running
       nimbus --help

Don't run nimbus-gateway directly. Use `nimbus start` / `nimbus stop` —
the CLI manages the Gateway's lifecycle, PID file, log rotation, and
graceful shutdown. Running the gateway binary directly bypasses all of
that and leaves orphaned state if the process is killed abnormally.

Uninstall:
  ./uninstall.sh --yes        (macOS / Linux)
  .\uninstall.ps1 -Yes        (Windows)

Integrity verification:
  Before running, verify the archive's hash against the published
  SHA256SUMS manifest on the GitHub Release page. The manifest is
  GPG-signed — see https://nimbus-agent.dev/user-guide/verify-your-download/
  for a full walkthrough, or run the bundled nimbus-verify.sh /
  nimbus-verify.ps1 helper from the release page.

Project GPG fingerprint:
  5A20 457C CD8B 53FF AA94 5240 886A DA6B 487C AB6E
  Cross-reference against four independent sources before trusting any
  key material — see https://nimbus-agent.dev/user-guide/verify-your-download/
  for the recommended cross-check procedure.

License:
  AGPL-3.0. Full text in LICENSE-AGPL.txt.

More information:
  Docs:        https://nimbus-agent.dev/
  Source:      https://github.com/nimbus-agent/Nimbus
  Issues:      https://github.com/nimbus-agent/Nimbus/issues
