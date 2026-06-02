# FIFA World Cup 2026 — Dataset Merge Strategy

**Prepared:** 2026-06-02  
**Author:** Senior Sports Data Scientist / ML Engineer  
**Prerequisite:** `data_audit.md` — read that first.

---

## Overview

Four datasets contribute features to the final training table. One dataset (`world-cup-2026-schedule.csv`) defines the prediction targets. The merge strategy has **5 sequential phases**:

```
Phase 1: Standardise all team names to a canonical registry
Phase 2: Normalise all date fields to YYYY-MM-DD
Phase 3: Build the base match table from results.csv
Phase 4: Join ELO ratings (pre-match) onto each match
Phase 5: Join FIFA rankings (closest prior semester) onto each match
Phase 6: Join shootout statistics as team-level lookup features
Phase 7: Append WC 2026 schedule rows as prediction targets
```

---

## Phase 1: Canonical Team Name Registry

### Why This Must Come First

All four datasets use different naming conventions for the same teams. A direct string join will silently create NaN-filled rows or wrong matches. **All team name normalisation must happen before any join.**

### Canonical Name Standard

Use the **WC 2026 schedule names** as the canonical standard, with historical aliases mapped backward into `results.csv`. The goal is to resolve each team to a single string that exists consistently across all datasets.

### Definitive Alias Mapping Table

Apply this mapping to **every team name column** in every dataset before any join:

```python
TEAM_NAME_MAP = {
    # results.csv aliases -> canonical
    "Cape Verde":                  "Cabo Verde",
    "DR Congo":                    "Congo DR",
    "Ivory Coast":                 "Côte d'Ivoire",
    "Czech Republic":              "Czechia",
    "South Korea":                 "Korea Republic",
    "Turkey":                      "Türkiye",

    # fifa_mens_rank.csv aliases -> canonical
    "IR Iran":                     "Iran",
    "USA":                         "United States",
    "Cape Verde Islands":          "Cabo Verde",
    "Curacao":                     "Curaçao",
    "FYR Macedonia":               "North Macedonia",
    "Congo DR":                    "Congo DR",         # already correct, keep
    "Aotearoa New Zealand":        "New Zealand",
    "Swaziland":                   "Eswatini",
    "Czechia":                     "Czechia",          # already correct, keep

    # eloratings.csv aliases -> canonical (after NBSP stripping)
    "Democratic Republic of Congo": "Congo DR",
    "Ivory Coast":                  "Côte d'Ivoire",
    "South Korea":                  "Korea Republic",
    "Turkey":                       "Türkiye",
    "China":                        "China PR",

    # Historical dead-team mappings (for long-range h2h lookups)
    "Yugoslavia":                  "Serbia",           # closest active successor
    "Czechoslovakia":              "Czechia",
    "German DR":                   "Germany",
    "West Germany":                "Germany",
    "Soviet Union":                "Russia",
    "Serbia and Montenegro":       "Serbia",
}
```

### ELO-Specific Pre-Processing

Before applying the alias map to ELO data, strip non-breaking spaces:

```python
df_elo["team"] = df_elo["team"].str.replace("\xa0", " ", regex=False)
```

Then apply `TEAM_NAME_MAP`.

---

## Phase 2: Date Normalisation

### `results.csv`
- Already in `YYYY-MM-DD` string format.
- Cast with: `pd.to_datetime(df_r["date"], format="%Y-%m-%d")`

### `eloratings.csv`
- Mixed `YYYY-MM-DD` (44 rows) and `M/D/YYYY` (6,634 rows).
- Parse with: `pd.to_datetime(df_e["date"], format="mixed", dayfirst=False)`
- Rename to `elo_date` to avoid column collision during joins.

### `fifa_mens_rank.csv`
- Uses `year` (int) + `semester` (1 or 2). There is no calendar date.
- Convert to a synthetic date for interval lookups:
  ```python
  # Semester 1 = Jan 1; Semester 2 = Jul 1
  df_f["rank_date"] = pd.to_datetime(
      df_f["date"].astype(str) + "-" + df_f["semester"].map({1: "01-01", 2: "07-01"}),
      format="%Y-%m-%d"
  )
  ```
- This creates a join-able date column (`rank_date`) for nearest-prior-snapshot merges.

### `shootouts.csv`
- Already in `YYYY-MM-DD`. Cast with: `pd.to_datetime(df_s["date"], format="%Y-%m-%d")`

### `world-cup-2026-schedule.csv`
- Already in `YYYY-MM-DD`. Cast with: `pd.to_datetime(df_wc["date"], format="%Y-%m-%d")`

---

## Phase 3: Base Match Table

**Source:** `results.csv`

The base table is the authoritative list of all historical matches. Every downstream feature is joined onto this.

### Filtering Recommendations

```python
# Step 1: Remove WC 2026 group stage (prediction targets — no labels yet)
df_base = df_r[df_r["date"] < "2026-06-11"].copy()

# Step 2 (Optional): Filter to FIFA-affiliated competitions only for cleaner training
FIFA_TOURNAMENTS = [
    "FIFA World Cup",
    "FIFA World Cup qualification",
    "UEFA Euro",
    "UEFA Euro qualification",
    "Copa America",
    "African Cup of Nations",
    "African Cup of Nations qualification",
    "AFC Asian Cup",
    "AFC Asian Cup qualification",
    "CONCACAF Gold Cup",
    "CONCACAF Nations League",
    "UEFA Nations League",
    "Friendly",  # keep but weight lower
]
df_base_filtered = df_base[df_base["tournament"].isin(FIFA_TOURNAMENTS)]
```

### Key Columns to Retain

```
date, home_team, away_team, home_score, away_score, tournament, neutral
```

Drop `city` and `country` (venue info is less useful than the `neutral` flag for modelling).

---

## Phase 4: ELO Feature Join

**Source:** `eloratings.csv`

### Join Logic

ELO ratings must be joined as **pre-match values** — i.e., the rating a team held *before* the match being joined.

This requires an **as-of (backward) join**: for each match date, find the most recent ELO rating for each team on or before that date.

### Step-by-Step

```python
# Step 1: Clean and parse ELO
df_e["team"] = df_e["team"].str.replace("\xa0", " ", regex=False).map(lambda x: TEAM_NAME_MAP.get(x, x))
df_e["elo_date"] = pd.to_datetime(df_e["date"], format="mixed", dayfirst=False)
df_e_clean = df_e[["elo_date", "team", "rating"]].sort_values("elo_date")

# Step 2: For each match row, get latest ELO for home_team as of match date - 1 day
import pandas as pd

def get_elo_asof(df_matches, df_elo, team_col, new_col):
    """As-of merge: attach the most recent ELO rating before each match."""
    result = pd.merge_asof(
        df_matches.sort_values("date"),
        df_elo.rename(columns={"team": team_col, "rating": new_col, "elo_date": "date"}),
        on="date",
        by=team_col,
        direction="backward",       # most recent rating AT OR BEFORE match date
        tolerance=pd.Timedelta("365 days"),  # only use ELO within 1 year
    )
    return result

df_base = get_elo_asof(df_base, df_e_clean, "home_team", "home_elo_pre")
df_base = get_elo_asof(df_base, df_e_clean, "away_team", "away_elo_pre")

# Step 3: Derived feature
df_base["elo_diff"] = df_base["home_elo_pre"] - df_base["away_elo_pre"]
```

### Join Keys

| Left Table | Right Table | Join Type | Key Columns |
|---|---|---|---|
| base match table | ELO (home team) | `merge_asof` backward | `date` (as-of), `home_team` |
| base match table | ELO (away team) | `merge_asof` backward | `date` (as-of), `away_team` |

> [!IMPORTANT]
> `merge_asof` requires **both tables to be sorted by the date column** before the call. Failure to sort will produce incorrect results without any error message.

### ELO Coverage Note

- ELO data ends at **December 13, 2025**.
- For WC 2026 matches (June 2026+), there will be no ELO entry within the `tolerance` window.
- **Action required:** Either extend ELO data to June 2026, or use the December 2025 ELO as a proxy (explicitly documented as an approximation).

---

## Phase 5: FIFA Ranking Feature Join

**Source:** `fifa_mens_rank.csv`

### Join Logic

FIFA ranking snapshots are semi-annual (twice per year). For each match, use the snapshot from the most recent semester that falls **before** the match date.

```python
# Step 1: Create rank_date synthetic column
df_f["rank_date"] = pd.to_datetime(
    df_f["date"].astype(str) + "-" + df_f["semester"].map({1: "01-01", 2: "07-01"}),
    format="%Y-%m-%d"
)

# Step 2: Apply canonical names
df_f["team"] = df_f["team"].map(lambda x: TEAM_NAME_MAP.get(x, x))

# Step 3: Keep only latest ranking columns needed
df_rank = df_f[["rank_date", "team", "rank", "total.points"]].sort_values("rank_date")
df_rank = df_rank.drop_duplicates(subset=["rank_date", "team"])  # removes Montenegro dups

# Step 4: As-of join for home team
df_base = pd.merge_asof(
    df_base.sort_values("date"),
    df_rank.rename(columns={"team": "home_team", "rank": "home_fifa_rank",
                             "total.points": "home_fifa_points", "rank_date": "date"}),
    on="date",
    by="home_team",
    direction="backward",
    tolerance=pd.Timedelta("550 days"),  # allow up to ~18 months back
)

# Step 5: As-of join for away team
df_base = pd.merge_asof(
    df_base.sort_values("date"),
    df_rank.rename(columns={"team": "away_team", "rank": "away_fifa_rank",
                             "total.points": "away_fifa_points", "rank_date": "date"}),
    on="date",
    by="away_team",
    direction="backward",
    tolerance=pd.Timedelta("550 days"),
)

# Step 6: Derived feature
df_base["rank_diff"] = df_base["home_fifa_rank"] - df_base["away_fifa_rank"]
df_base["points_ratio"] = df_base["home_fifa_points"] / df_base["away_fifa_points"].replace(0, 1)
```

### Join Keys

| Left Table | Right Table | Join Type | Key Columns |
|---|---|---|---|
| base match table | FIFA rank (home) | `merge_asof` backward | `date` (as-of), `home_team` |
| base match table | FIFA rank (away) | `merge_asof` backward | `date` (as-of), `away_team` |

> [!NOTE]
> FIFA ranking data begins in **1992**. All matches before 1992 will have `NaN` for FIFA rank features. This is acceptable — most pre-1992 matches are friendlies with lower training relevance. Apply appropriate imputation (e.g., impute with league average or leave as NaN for tree-based models).

---

## Phase 6: Shootout Statistics Join

**Source:** `shootouts.csv`

### Join Logic

Shootout statistics are computed as **team-level aggregate features**, not per-match. For each team, compute prior to each match:
- Total shootouts played
- Shootout win count and win rate
- First-shooter win rate

This requires a self-join / expanding window aggregation, not a direct merge.

```python
# Step 1: Build shootout win stats
df_s["team"] = df_s["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))  # normalize
df_s["won"] = (df_s["winner"] == df_s["home_team"]).astype(int)

# For each team in each match position
shootout_records = pd.concat([
    df_s[["date","home_team","winner"]].rename(columns={"home_team":"team"}).assign(
        won=lambda x: (x["winner"] == x["team"]).astype(int)
    ),
    df_s[["date","away_team","winner"]].rename(columns={"away_team":"team"}).assign(
        won=lambda x: (x["winner"] == x["team"]).astype(int)
    )
]).sort_values("date")

# Rolling cumulative stats (shift by 1 to avoid leakage)
shootout_stats = (
    shootout_records
    .groupby("team")
    .apply(lambda g: g.assign(
        shootout_total_prior=g["won"].expanding().count().shift(1),
        shootout_win_rate_prior=g["won"].expanding().mean().shift(1),
    ))
    .reset_index(drop=True)
)[["date","team","shootout_total_prior","shootout_win_rate_prior"]]

# Step 2: As-of join to base match table
df_base = pd.merge_asof(
    df_base.sort_values("date"),
    shootout_stats.rename(columns={"team": "home_team",
                                    "shootout_total_prior": "home_shootout_count",
                                    "shootout_win_rate_prior": "home_shootout_win_rate"}),
    on="date", by="home_team", direction="backward"
)
df_base = pd.merge_asof(
    df_base.sort_values("date"),
    shootout_stats.rename(columns={"team": "away_team",
                                    "shootout_total_prior": "away_shootout_count",
                                    "shootout_win_rate_prior": "away_shootout_win_rate"}),
    on="date", by="away_team", direction="backward"
)
```

### Join Keys

| Left Table | Right Table | Join Type | Key Columns |
|---|---|---|---|
| base match table | shootout stats (home) | `merge_asof` backward | `date`, `home_team` |
| base match table | shootout stats (away) | `merge_asof` backward | `date`, `away_team` |

---

## Phase 7: WC 2026 Prediction Target Rows

The `world-cup-2026-schedule.csv` defines the group-stage matches that need to be predicted. After the training pipeline is built, create a **separate prediction dataframe** using these rows.

```python
# Extract group stage confirmed fixtures
wc_pred = df_wc[df_wc["status"] == "confirmed_group_fixture"][[
    "match_number", "stage", "group", "date", "team_a", "team_b", "venue", "city", "country"
]].copy()

wc_pred = wc_pred.rename(columns={"team_a": "home_team", "team_b": "away_team"})
wc_pred["home_team"] = wc_pred["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
wc_pred["away_team"] = wc_pred["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
wc_pred["neutral"] = True   # all WC matches are at neutral venues
wc_pred["tournament"] = "FIFA World Cup"

# Then apply exactly the same ELO, FIFA rank, shootout joins as Phase 4-6 above
```

> [!IMPORTANT]
> Do NOT join the WC 2026 rows using results already in `results.csv` (the 72 NaN-score rows). Build the prediction input from `world-cup-2026-schedule.csv` as the definitive source.

---

## Full Join Sequence Summary

```
results.csv  (base table — 49,281 scored matches after filtering)
     |
     v
[Phase 1: Apply TEAM_NAME_MAP to home_team, away_team]
[Phase 2: Cast date to datetime]
     |
     v
[Phase 4: merge_asof LEFT join ELO (home)] --> home_elo_pre
[Phase 4: merge_asof LEFT join ELO (away)] --> away_elo_pre
     |
     v
[Phase 5: merge_asof LEFT join FIFA rank (home)] --> home_fifa_rank, home_fifa_points
[Phase 5: merge_asof LEFT join FIFA rank (away)] --> away_fifa_rank, away_fifa_points
     |
     v
[Phase 6: merge_asof LEFT join Shootout stats (home)] --> home_shootout_*
[Phase 6: merge_asof LEFT join Shootout stats (away)] --> away_shootout_*
     |
     v
[Engineer rolling features on the assembled table]
     |
     v
FINAL TRAINING TABLE (one row per historical match)

     +

WC 2026 schedule (72 group-stage rows) with same feature pipeline
     |
     v
PREDICTION INPUT TABLE (72 rows, no score labels)
```

---

## Join Validation Checklist

After every merge, run these checks:

```python
# 1. Row count should not change on LEFT joins
assert len(df_after_join) == len(df_before_join), "Unexpected row explosion"

# 2. No NaN rates above acceptable threshold
elo_nan_rate = df_base["home_elo_pre"].isna().mean()
assert elo_nan_rate < 0.15, f"Too many ELO nulls: {elo_nan_rate:.1%}"

rank_nan_rate = df_base["home_fifa_rank"].isna().mean()
assert rank_nan_rate < 0.40, f"Too many rank nulls: {rank_nan_rate:.1%}"  # pre-1992 matches expected

# 3. WC 2026 teams all have ELO and rank
wc_only = df_base[df_base["tournament"] == "FIFA World Cup"]
assert wc_only["home_elo_pre"].isna().sum() == 0, "WC matches missing ELO"

# 4. No future data leaked into training set
assert (df_base["date"] >= pd.Timestamp("2026-06-11")).sum() == 0, "Future match in training!"
```

---

## Merge Quality Notes

| Join | Expected NaN Rate | Cause | Mitigation |
|---|---|---|---|
| ELO pre-match | ~2-5% | Teams not in ELO dataset (CONIFA, etc.) | Impute with confederation average ELO |
| ELO for WC 2026 | Up to 100% if not extended | ELO data ends Dec 2025 | Extend ELO data or use Dec 2025 values |
| FIFA rank | ~35-40% | Ranking starts 1992 | Impute with median rank (unranked nations) |
| FIFA rank for WC 2026 | 0% | 2024 S2 covers all 48 teams | None needed |
| Shootout stats | ~80% for early matches | Shootout data starts 1967, sparse early | Impute with 0 (no shootout history = 0 rate) |

---

*End of Merge Strategy Document*
