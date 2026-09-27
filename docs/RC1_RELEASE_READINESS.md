# RC-1 Release Readiness

This checklist defines the remaining proof required before calling Gotcha V0 release-ready.

## Automated gates

- [ ] CI passes on Node 20, 22, 24, and 26.
- [ ] Full `npm test` passes in every matrix job.
- [ ] `npm pack` succeeds from the release candidate.
- [ ] The packed tarball installs into a fresh consumer directory.
- [ ] The installed CLI runs `gotcha-ai demo` successfully.
- [ ] The packed artifact exposes the documented public API.

These checks are enforced by `.github/workflows/ci.yml`.

## Manual release-candidate gates

- [ ] Run one end-to-end Guided V0 journey with a real provider:
  `init -> run -> human decisions -> protection proposal -> session -> evaluator improvement -> verify`.
- [ ] Run one fresh-user acceptance pass using only the README and a clean environment.
- [ ] Freeze the release candidate SHA and version.
- [ ] Verify the final tarball contents from that exact SHA.
- [ ] Publish using the authorized npm account.
- [ ] Install the published version into a new empty project and repeat the demo/public-API smoke test.

## Release rule

Do not call V0 release-ready until all automated and manual gates above are green.

A successful deterministic or CI test run is not a substitute for real-provider proof, npm publication authorization, or post-publication installation proof.
