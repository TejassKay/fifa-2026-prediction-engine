# FIFA World Cup 2026 — Data Audit Report

**Prepared:** 2026-06-02  
**Author:** Senior Sports Data Scientist / ML Engineer  
**Scope:** Complete pre-modelling data audit — no models, no predictions.

---

## Executive Summary

Five datasets are available. They span 150+ years of international football. The core results dataset (`results.csv`) is the richest source with 49,353 matches. All datasets are broadly usable, but **require non-trivial standardisation work before merging**. The three primary issues are:

1. **Team naming inconsistencies** — the same nation uses different names across different datasets and even within a single dataset over time.
2. **Date format heterogeneity** — `eloratings.csv` mixes ISO (`YYYY-MM-DD`) and US-locale (`M/D/YYYY`) formats; `fifa_mens_rank.csv` uses a year-integer + semester system rather than a calendar date.
3. **ELO data staleness** — `eloratings.csv` cuts off at December 2025, leaving a ~6-month gap before the 2026 tournament starts (June 11, 2026).

---

## Dataset 1: `results.csv`

### Overview

| Property | Value |
|---|---|
| **Rows** | 49,353 |
| **Columns** | 9 |
| **Date range** | 1872-11-30 to 2026-06-27 |
| **Unique teams** | 336 |
| **Duplicate rows** | 0 |

### Column Schema

| Column | Dtype | Description |
|---|---|---|
| `date` | object (string) | Match date in `YYYY-MM-DD` format |
| `home_team` | object | Home team name |
| `away_team` | object | Away team name |
| `home_score` | float64 | Goals scored by home team (NaN if unplayed) |
| `away_score` | float64 | Goals scored by away team (NaN if unplayed) |
| `tournament` | object | Competition name |
| `city` | object | Host city |
| `country` | object | Host country |
| `neutral` | bool | Whether match was played at a neutral venue |

### Missing Values

| Column | Missing Count | Notes |
|---|---|---|
| `home_score` | 72 | All 72 are WC 2026 group-stage matches (unplayed) |
| `away_score` | 72 | Same rows as above |
| All others | 0 | Complete |

> [!IMPORTANT]
> The 72 rows with `NaN` scores are the WC 2026 group-stage fixtures that were pre-loaded into the dataset. They are **not errors** — they are the prediction targets. They must be **held out** and never used as training labels.

### Duplicate Records

**None.** The dataset is unique at the (`date`, `home_team`, `away_team`) level.

### Score Statistics

| Metric | home_score | away_score |
|---|---|---|
| Count (non-null) | 49,281 | 49,281 |
| Mean | 1.76 | 1.18 |
| Std | 1.77 | 1.40 |
| Min | 0 | 0 |
| Max | **31** | **21** |

> [!NOTE]
> Extreme scores (>=15 goals) appear in 48 matches. These are mostly from South Pacific Games, Island Games, and CONIFA events — not FIFA-affiliated competitions. They are legitimate data points but represent non-comparable competition standards. Consider filtering or down-weighting these during training.

### Notable Tournament Counts (Top 10)

| Tournament | Matches |
|---|---|
| Friendly | 18,279 |
| FIFA World Cup qualification | 8,771 |
| UEFA Euro qualification | 2,824 |
| African Cup of Nations qualification | 2,327 |
| FIFA World Cup | 1,036 |
| Copa America | 869 |
| African Cup of Nations | 845 |
| AFC Asian Cup qualification | 829 |
| UEFA Nations League | 658 |
| CECAFA Cup | 620 |

> [!TIP]
> The dataset contains **1,036 FIFA World Cup matches** across all editions. This is the most relevant subset for WC 2026 prediction, but the sample is limited for deep learning. Supplement with WC qualifying matches to increase training data density.

### Date Format

All dates in `results.csv` are consistently `YYYY-MM-DD`. No issues.

---

## Dataset 2: `eloratings.csv`

### Overview

| Property | Value |
|---|---|
| **Rows** | 6,678 |
| **Columns** | 4 |
| **Date range (raw)** | 1872-11-30 to 12/13/2025 |
| **Unique teams** | 270 |
| **Duplicate rows** | 0 |

### Column Schema

| Column | Dtype | Description |
|---|---|---|
| `date` | object | Date of ELO change (two formats — see below) |
| `team` | object | Team name |
| `rating` | float64 | ELO rating after the match |
| `change` | int64 | Change in ELO from this match |

### Missing Values

| Column | Missing Count | Notes |
|---|---|---|
| `rating` | 31 | Some entries have rating = 0.0 (anomalous, likely placeholder) |
| `change` | 0 | Complete |
| `date`, `team` | 0 | Complete |

### Duplicate Records

**None.**

### CRITICAL ISSUE: Mixed Date Formats

```
ISO format   (YYYY-MM-DD): 44 rows   (earliest records only)
US locale    (M/D/YYYY):   6,634 rows (the vast majority)
```

Both formats co-exist in the same column. Pandas `pd.to_datetime()` with a fixed format string will fail. Must use `format='mixed'` or the `dateutil` parser. **This must be resolved before any time-based join.**

### CRITICAL ISSUE: Non-Breaking Spaces in Team Names

Multiple team names contain Unicode **non-breaking space** (`\xa0`) instead of regular spaces. Examples:

- `"Bosnia\xa0and\xa0Herzegovina"` instead of `"Bosnia and Herzegovina"`
- `"Saudi\xa0Arabia"` instead of `"Saudi Arabia"`
- `"United\xa0States"` instead of `"United States"`
- `"South\xa0Africa"` instead of `"South Africa"`
- `"New\xa0Zealand"` instead of `"New Zealand"`

A simple `==` string match will fail silently. **All ELO team names must be cleaned with `.str.replace('\xa0', ' ')`** before any join.

### CRITICAL ISSUE: ELO Data Staleness

The most recent ELO entries are dated **December 13, 2025** — approximately **6 months before** the WC 2026 group stage (June 11, 2026). Six months of international fixtures, including WC qualifying playoffs in March 2026, are not reflected.

**Recommendation:** Supplement with the most recent ELO data from eloratings.net, or compute forward from `results.csv` for the gap period.

### ELO Rating Statistics

| Metric | rating | change |
|---|---|---|
| Mean | 1,490.96 | 0.00 |
| Std | 299.25 | 15.32 |
| Min | 0.00 | -86 |
| Max | 2,171.00 | +86 |

---

## Dataset 3: `fifa_mens_rank.csv`

### Overview

| Property | Value |
|---|---|
| **Rows** | 13,130 |
| **Columns** | 8 |
| **Date range** | 1992 to 2024 (by year + semester) |
| **Unique teams** | 230 |
| **Duplicate rows** | 4 (two identical pairs for Montenegro 2007) |

### Column Schema

| Column | Dtype | Description |
|---|---|---|
| `date` | int64 | Calendar year of ranking snapshot |
| `semester` | int64 | 1 = first half of year, 2 = second half |
| `rank` | int64 | FIFA world ranking position |
| `team` | object | Team name (FIFA official) |
| `acronym` | object | 3-letter FIFA acronym |
| `total.points` | float64 | FIFA ranking points |
| `previous.points` | float64 | Points in prior period |
| `diff.points` | float64 | Change in points this period |

### Missing Values

**None** in any column.

### Duplicate Records

4 rows: 2 identical pairs for **Montenegro in 2007** (Semester 1 and Semester 2). Safe to deduplicate with `drop_duplicates()`.

### ISSUE: No Granular Date Field

The `date` column is a **year integer** combined with a `semester` indicator. It cannot be joined to a specific calendar match date directly.

**Approach:** Map each match to the closest semester snapshot prior to the match date (e.g., for a June 2026 match, use 2024 Semester 2 — the most recent available period).

### ISSUE: Latest Snapshot is 2024 Semester 2

This dataset is missing 2025 and early 2026 ranking updates. The actual WC 2026 official ranking (March 2026 FIFA ranking) is not present.

### Acronym Inconsistency

| Team | Acronyms Found |
|---|---|
| Lebanon | `LBN` and `LIB` (two different codes across different years) |

### Team Name Internal Variants

Multiple naming variants exist within the same dataset across years:
- `Cape Verde Islands` vs `Cabo Verde`
- `Curacao` vs `Curaçao`
- `Sao Tome e Principe` vs `São Tomé and Príncipe`
- `St Kitts and Nevis` vs `St. Kitts and Nevis` vs `Saint Kitts and Nevis`
- `FYR Macedonia` vs `North Macedonia`
- `Czechia` vs `Czech Republic`
- `Aotearoa New Zealand` vs `New Zealand`
- `IR Iran` vs `Iran`
- `USA` vs `United States`

---

## Dataset 4: `shootouts.csv`

### Overview

| Property | Value |
|---|---|
| **Rows** | 675 |
| **Columns** | 5 |
| **Date range** | 1967-08-22 to 2026-03-31 |
| **Unique teams** | 226 |
| **Duplicate rows** | 0 |

### Column Schema

| Column | Dtype | Description |
|---|---|---|
| `date` | object | Match date in `YYYY-MM-DD` format |
| `home_team` | object | Home team name |
| `away_team` | object | Away team name |
| `winner` | object | Team that won the shootout |
| `first_shooter` | object | Team that shot first in the shootout |

### Missing Values

| Column | Missing Count | Notes |
|---|---|---|
| `first_shooter` | 429 (63.6%) | Only recorded from more recent years |
| All others | 0 | Complete |

### Date Format

All dates are `YYYY-MM-DD`. Consistent. No issues.

### Key Observation

675 penalty shootouts across 226 teams since 1967. This is a **supplementary lookup table**, not a primary training source. It enables engineering of:
- Shootout win rate per team
- First-shooter tendency (slight psychological advantage)
- Historical shootout success in high-pressure matches

---

## Dataset 5: `world-cup-2026-schedule.csv`

### Overview

| Property | Value |
|---|---|
| **Rows** | 104 |
| **Columns** | 13 |
| **Date range** | 2026-06-11 to 2026-07-19 |
| **Duplicate rows** | 0 |

### Column Schema

| Column | Dtype | Description |
|---|---|---|
| `match_number` | int64 | Sequential match number (1-104) |
| `stage` | object | Tournament stage label |
| `group` | object | Group letter (NaN for knockout rounds) |
| `date` | object | Match date `YYYY-MM-DD` |
| `time_et` | object | Kickoff time (Eastern Time, 24h) |
| `time_local` | object | Kickoff time (local venue) |
| `team_a` | object | Home/first team name |
| `team_b` | object | Away/second team name |
| `venue` | object | Stadium name |
| `city` | object | Host city |
| `country` | object | Host country |
| `status` | object | `confirmed_group_fixture` or `bracket_slot` |
| `source` | object | Data source URL (same for all rows) |

### Missing Values

| Column | Missing | Notes |
|---|---|---|
| `group` | 32 | Expected — knockout matches have no group |
| All others | 0 | Complete |

### Stage Distribution

| Stage | Matches |
|---|---|
| Group Stage | 72 |
| Round of 32 | 16 |
| Round of 16 | 8 |
| Quarter-finals | 4 |
| Semi-finals | 2 |
| Third Place | 1 |
| Final | 1 |

### Host Distribution

| Country | Matches |
|---|---|
| United States | 78 |
| Mexico | 13 |
| Canada | 13 |

---

## Cross-Dataset Team Naming Inconsistencies

This is the most critical data quality issue. The table below maps each WC 2026 confirmed team across all datasets:

| WC 2026 Schedule Name | results.csv | eloratings.csv | fifa_mens_rank.csv |
|---|---|---|---|
| Algeria | Algeria OK | Algeria OK | Algeria OK |
| Argentina | Argentina OK | Argentina OK | Argentina OK |
| Australia | Australia OK | Australia OK | Australia OK |
| Austria | Austria OK | Austria OK | Austria OK |
| Belgium | Belgium OK | Belgium OK | Belgium OK |
| Bosnia and Herzegovina | Bosnia and Herzegovina OK | `Bosnia\xa0and\xa0Herzegovina` NBSP | Bosnia and Herzegovina OK |
| Brazil | Brazil OK | Brazil OK | Brazil OK |
| **Cabo Verde** | `Cape Verde` MISMATCH | `Cape Verde` MISMATCH | `Cabo Verde`/`Cape Verde Islands` VARIANT |
| Canada | Canada OK | Canada OK | Canada OK |
| Colombia | Colombia OK | Colombia OK | Colombia OK |
| **Congo DR** | `DR Congo` MISMATCH | `Democratic Republic of Congo` MISMATCH | Congo DR OK |
| Croatia | Croatia OK | Croatia OK | Croatia OK |
| Curaçao | Curaçao OK | Curaçao OK | `Curacao` MISSING ACCENT |
| **Czechia** | `Czech Republic` MISMATCH | Czechia OK | Czechia / Czech Republic VARIANT |
| **Côte d'Ivoire** | `Ivory Coast` MISMATCH | MISSING | Côte d'Ivoire OK |
| Ecuador | Ecuador OK | Ecuador OK | Ecuador OK |
| Egypt | Egypt OK | Egypt OK | Egypt OK |
| England | England OK | England OK | England OK |
| France | France OK | France OK | France OK |
| Germany | Germany OK | Germany OK | Germany OK |
| Ghana | Ghana OK | Ghana OK | Ghana OK |
| Haiti | Haiti OK | Haiti OK | Haiti OK |
| **Iran** | Iran OK | Iran OK | `IR Iran` MISMATCH |
| Iraq | Iraq OK | Iraq OK | Iraq OK |
| Japan | Japan OK | Japan OK | Japan OK |
| Jordan | Jordan OK | Jordan OK | Jordan OK |
| **Korea Republic** | `South Korea` MISMATCH | POOR MATCH | Korea Republic OK |
| Mexico | Mexico OK | Mexico OK | Mexico OK |
| Morocco | Morocco OK | Morocco OK | Morocco OK |
| Netherlands | Netherlands OK | Netherlands OK | Netherlands OK |
| **New Zealand** | New Zealand OK | `New\xa0Zealand` NBSP | New Zealand / Aotearoa New Zealand VARIANT |
| Norway | Norway OK | Norway OK | Norway OK |
| Panama | Panama OK | Panama OK | Panama OK |
| Paraguay | Paraguay OK | Paraguay OK | Paraguay OK |
| Portugal | Portugal OK | Portugal OK | Portugal OK |
| Qatar | Qatar OK | Qatar OK | Qatar OK |
| **Saudi Arabia** | Saudi Arabia OK | `Saudi\xa0Arabia` NBSP | Saudi Arabia OK |
| Scotland | Scotland OK | Scotland OK | Scotland OK |
| Senegal | Senegal OK | Senegal OK | Senegal OK |
| **South Africa** | South Africa OK | `South\xa0Africa` NBSP | South Africa OK |
| Spain | Spain OK | Spain OK | Spain OK |
| Sweden | Sweden OK | Sweden OK | Sweden OK |
| Switzerland | Switzerland OK | Switzerland OK | Switzerland OK |
| Tunisia | Tunisia OK | Tunisia OK | Tunisia OK |
| **Türkiye** | `Turkey` MISMATCH | `Turkey` MISMATCH | Türkiye OK |
| **United States** | United States OK | `United\xa0States` NBSP | `USA` MISMATCH |
| Uruguay | Uruguay OK | Uruguay OK | Uruguay OK |
| Uzbekistan | Uzbekistan OK | Uzbekistan OK | Uzbekistan OK |

### Canonical Name Mapping Required

| WC 2026 Canonical | Map FROM (results.csv) | Map FROM (elo) | Map FROM (rank) |
|---|---|---|---|
| Cabo Verde | Cape Verde | Cape Verde | Cape Verde Islands |
| Congo DR | DR Congo | Democratic Republic of Congo | — |
| Czechia | Czech Republic | — | Czech Republic |
| Côte d'Ivoire | Ivory Coast | (MISSING — impute from results) | — |
| Korea Republic | South Korea | South Korea | — |
| Türkiye | Turkey | Turkey | — |
| Iran | — | — | IR Iran |
| United States | — | (strip NBSP) | USA |

---

## Recommended Training Data Schema

After cleaning and merging, each row in the final training table should represent one match with these columns:

```
match_id                     : string   (date__home__away)
date                         : date     (YYYY-MM-DD)
tournament                   : string
stage                        : string   (Group Stage, QF, SF, Final, etc.)
is_neutral                   : bool

home_team                    : string   (canonical name)
away_team                    : string   (canonical name)

# Strength signals (pre-match, no leakage)
home_elo_pre                 : float    (ELO BEFORE this match)
away_elo_pre                 : float
elo_diff                     : float    (home - away)
home_fifa_rank               : int      (closest prior semester)
away_fifa_rank               : int
home_fifa_points             : float
away_fifa_points             : float
rank_diff                    : int      (home_rank - away_rank)

# Recent form (rolling window — computed on prior matches only)
home_goals_scored_avg_L5     : float
home_goals_conceded_avg_L5   : float
away_goals_scored_avg_L5     : float
away_goals_conceded_avg_L5   : float
home_win_rate_L10            : float
away_win_rate_L10            : float
home_goal_diff_avg_L10       : float
away_goal_diff_avg_L10       : float

# Head-to-head (historical, pre-match only)
h2h_home_win_rate            : float
h2h_avg_goals_home           : float
h2h_avg_goals_away           : float
h2h_matches_played           : int

# Tournament experience
home_wc_appearances          : int
away_wc_appearances          : int
home_wc_win_rate             : float
away_wc_win_rate             : float

# Shootout history (knockout rounds only)
home_shootout_win_rate       : float
away_shootout_win_rate       : float
home_shootout_count          : int
away_shootout_count          : int

# Venue/context
venue_country                : string
altitude_m                   : float    (to be added externally)
confederation_home           : string   (UEFA, CONMEBOL, AFC, etc.)
confederation_away           : string

# Targets (training labels — exclude from prediction input)
home_score                   : int
away_score                   : int
result                       : string   (H / D / A)
goal_diff                    : int      (home_score - away_score)
```

---

## Data Leakage Risks

> [!CAUTION]
> Every one of these leakage vectors must be eliminated before model training.

### 1. WC 2026 Fixture Rows in results.csv
72 group-stage WC 2026 matches are already in `results.csv` with NaN scores. If not explicitly removed, a train/test split by row index (not date) could include them in training. **Always filter: `date < '2026-06-11'` for training data.**

### 2. ELO `change` Column
The `change` column records the ELO change *resulting from* the match — it is post-match information. **Never use `change` as a feature.** Only use `rating`, and even then, shift it: the feature should be the rating from the *previous* row for that team, not the rating after the current match.

### 3. FIFA Ranking `diff.points`
`diff.points` represents intra-semester change — a retrospective signal. Use only `total.points` from the most recent semester snapshot that falls *before* the match date.

### 4. Rolling Features Must Shift by One
All rolling-window aggregations (goals, wins, form) must use `.shift(1)` before `.rolling()` to ensure the current match result is never included in its own features.

### 5. Head-to-Head Features Must Use Temporal Filter
H2H statistics must be computed using `date < match_date` as a strict filter — the current match can never inform its own H2H feature.

### 6. Score-Derived Features as Inputs
Any feature derived from a final score (e.g., goal difference, result label) is a leakage risk if used as input to predict that same match. These must only ever be targets.

---

## Feature Engineering Recommendations

### Group 1: Team Strength Signals
- ELO difference (home minus away) — strongest single predictor in the literature
- ELO momentum (change over last 12 months)
- FIFA ranking gap and points ratio
- Confederation-level average ELO

### Group 2: Recent Form (Rolling Windows: 5, 10, 20 matches)
- Goals scored average
- Goals conceded average
- Goal difference average
- Win/draw/loss rate
- Clean sheet rate
- Unbeaten run length
- Days since last match (rest/fatigue proxy)
- Separate home-specific and away-specific form windows

### Group 3: Tournament Context
- WC experience (number of prior WC appearances)
- WC win percentage historically
- Confederation championship performance (AFCON wins, Copa America wins, etc.)
- Qualifying campaign statistics (goals scored/conceded across qualifying)

### Group 4: Venue / Environmental
- Neutral venue flag (already present)
- Whether match is played in home confederation continent
- Venue altitude in metres (Estadio Azteca at ~2,240m is a significant factor)
- Weather/climate zone (to be sourced externally)

### Group 5: Penalty Shootout Features (knockout rounds only)
- Shootout win rate
- Shootout experience (total shootouts participated in)
- First-shooter flag (research shows ~60% win rate for teams shooting first)

### Group 6: Derived Targets
- `result`: 3-class label (H / D / A) for classification models
- `home_score`, `away_score`: bivariate Poisson regression targets
- `goal_diff`: single regression target for simpler models
- `is_draw`: binary, useful for draw probability estimation

---

## Data Quality Summary

| Dataset | Rows x Cols | Null Issue | Duplicates | Date Format | Team Names | Grade |
|---|---|---|---|---|---|---|
| results.csv | 49,353 x 9 | 72 (target rows) | None | Consistent ISO | Historical aliases | HIGH |
| eloratings.csv | 6,678 x 4 | 31 (rating=0) | None | MIXED FORMATS | NBSP chars + aliases | MEDIUM |
| fifa_mens_rank.csv | 13,130 x 8 | None | 4 (Montenegro) | Year+semester only | Multiple aliases | MEDIUM |
| shootouts.csv | 675 x 5 | 429 (first_shooter) | None | Consistent ISO | Consistent | HIGH |
| wc-2026-schedule.csv | 104 x 13 | 32 (group=NaN) | None | Consistent ISO | FIFA official names | MEDIUM |

---

*End of Data Audit Report*
