# Release guide

[Español](RELEASING.md) | **English**

This guide documents the safe release process for My Honda+ Vehicle Card and prevents publishing a stale bundle.

**Creating a manual GitHub Release does not update the project's version or generate the HACS JavaScript.** Prepare the version pull request first, then trigger the **Release** workflow as described here. A tag or release without the `myhondaplus-vehicle-card.js` asset is not a complete publication.

## 1. Choose the version

The project follows Semantic Versioning:

- patch for compatible fixes;
- minor for compatible features;
- major for incompatible changes.

Never reuse a published tag or create a release manually from an older commit.

## 2. Prepare the version pull request

Create a branch from the latest `main` commit and update together:

- `package.json`;
- both project-version occurrences in `package-lock.json`;
- `CHANGELOG.md`, moving changes from **Unreleased** to the new version and date.

Verify that all three files contain exactly the same version.

## 3. Validate before merge

Run:

```bash
npm ci
npm run audit:prod
npm run check
npx playwright install chromium
npm run test:visual
```

Open the pull request. Do not merge until **CI**, **Validate** and **HACS** are green and no actionable review feedback remains.

## 4. Wait for the `main` bundle

After merge, **Build distribution** must create a later commit:

```text
Build dashboard distribution [skip ci]
```

Publish from that commit, not from the preceding merge. Confirm that the diff for `dist/myhondaplus-vehicle-card.js` contains the new version injected by Vite.

## 5. Trigger publication

Create `publish/vX.Y.Z` from the final distribution commit. When using the GitHub connector, creating the ref alone may not emit a `push` event; create this marker on the publication branch:

```text
.release/vX.Y.Z
```

Record the distribution commit SHA in the marker. This triggers **Release** without changing `main` or the bundle.

The workflow:

1. derives the tag from the branch name;
2. verifies that the tag matches `package.json`;
3. runs installation, audit, checks, build and Chromium browser tests;
4. creates the tag and GitHub Release;
5. attaches `dist/myhondaplus-vehicle-card.js`.

## 6. Verify the release

Do not announce the release until:

- `vX.Y.Z` exists;
- the GitHub Release is published;
- the JavaScript asset is attached;
- tagged `package.json` contains the correct version;
- the generated bundle identifies the same version;
- HACS can expose it as `latest_version` after its periodic check.

HACS detection can take time. Restarting Home Assistant does not force that check.

## Recovering from an incorrect release

Do not silently overwrite a release or move a tag already consumed by users. Fix the cause, increment the patch version and publish a new artifact from the latest valid distribution commit.

If a release shipped stale code, lacks the JavaScript asset or tags a package with a different version:

1. identify the latest correct `main` commit;
2. synchronize metadata in a new patch;
3. wait for the new distribution commit;
4. verify the embedded version;
5. publish a new tag.

## Checklist

- [ ] Semantic version selected.
- [ ] Package, lockfile and changelog synchronized.
- [ ] CI, Validate and HACS green.
- [ ] Bundle regenerated after merge.
- [ ] Embedded bundle version verified.
- [ ] `publish/vX.Y.Z` created from the correct commit.
- [ ] Tag, release and asset verified.
- [ ] HACS detects the version or awaits its periodic cycle.
