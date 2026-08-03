# dev-catalog — a marketplace catalog served from this machine

A catalog and one use-case bundle, laid out exactly as GitLab serves raw files, so
the marketplace can install from them with no code change and nothing published.

```bash
python3 -m http.server 8099 --directory dev-catalog
```

Then point the app at it (`app/.env.local`):

```
REPO_LIST_URL="http://localhost:8099/index.json"
REPO_LIST_TTL_SECONDS="5"
```

## Why it exists

The published catalog's three use cases all carry a nested `location` that
references a separate `GeoPoint` structure. That means a geometry column and a
cross-structure reference — two problems the install path does not handle yet, and
neither of them the one we are trying to prove. `hello-trafficcounter` is the same
use case with those two removed: one counting station, three flat fields.

Keeping it local means the shape can change hourly without a catalog release, and
nothing half-finished appears in anyone else's marketplace. Once the install path
is settled it should move to its own repo and a real catalog entry.

## The layout is not arbitrary

`fetchUseCaseBundle` builds GitLab-style raw URLs — `<repoUrl>/-/raw/<ref>/<path>`
— so the directory literally contains a folder named `-`. A plain static server
over this tree satisfies the same paths.

The commit-SHA lookup (`resolveCommitSha`) hits GitLab's API, gets a 404 here, and
falls back to the ref. That path is designed to degrade; the install just records
no immutable commit pin.

```
dev-catalog/
  index.json                                   → http://localhost:8099/index.json
  commune-mittelerde-hello/
    -/raw/v1.0.0/core-ir/dataset.json
    -/raw/v1.0.0/core-ir/TrafficCount.schema.json
```

Bump `gitIdentifier` in `index.json` and add a directory beside `v1.0.0` to serve
a second version.
