# Putnam classification methodology

## Review order

Problems are processed one complete exam year at a time, beginning with 2025 and moving backward.

Current progress:

- 2025: manually solution-reviewed from the official MAA solutions and score table
- 2024: manually solution-reviewed from the official MAA solutions and score table
- 2023: solution-analyzed from the archived problem and solution TeX
- 2022 backward: processed automatically in descending order by GitHub Actions

## Verification labels

The interface distinguishes two evidence levels:

- **Solution reviewed**: the year-specific metadata was manually checked against the official solution and, when available, official per-problem score statistics.
- **Solution analyzed**: GitHub Models read the archived solution and produced structured metadata that passed schema and repository validation, but the record is still awaiting manual verification.

An analyzed record is never displayed with the green manually reviewed label. Automated records use a separate amber label and lower confidence.

## Sources

For manually reviewed years, classifications use:

1. the official MAA problem and solution document;
2. the official MAA per-problem score distribution, when published;
3. the existing statement and broad subject tags in the generated historical catalog.

For automated historical years, the workflow downloads the year’s problem and solution TeX from the Putnam Archive. The source files are hashed for traceability, but the application stores only original summaries and evidence descriptions—not the full solution text.

## Difficulty calibration

When an official score distribution is available, the empirical difficulty is

```text
empirical = 1 + 9 × (1 − mean_score / 10)
```

This maps a mean score of 10 to difficulty 1 and a mean score of 0 to difficulty 10. The empirical value is shrunk toward a conservative exam-position prior:

| Position | Prior |
|---|---:|
| A1/B1 | 2.5 |
| A2/B2 | 4.0 |
| A3/B3 | 5.5 |
| A4/B4 | 6.5 |
| A5/B5 | 7.5 |
| A6/B6 | 8.5 |

For manually reviewed years with score data:

```text
overall = 65% × empirical + 35% × position_prior
```

For automated solution-analyzed years without a normalized score table, the proof-based profile is

```text
proof_based = 45% × insight
            + 20% × technical
            + 15% × prerequisite
            + 20% × proof_writing
```

and

```text
overall = 65% × proof_based + 35% × position_prior
```

The four component ratings represent:

- **Insight:** difficulty of discovering the key observation or construction;
- **Technical:** algebraic, computational, or case-management burden after the idea is known;
- **Prerequisite:** depth of mathematical background needed;
- **Proof writing:** difficulty of organizing a complete rigorous argument.

## Technique classification

Every reviewed or analyzed problem distinguishes:

- **Primary techniques:** indispensable ideas driving the proof;
- **Secondary techniques:** tools used to execute or justify the main idea;
- **Solution archetype:** a subject-independent description of the proof architecture;
- **Technique evidence:** a short explanation of the exact solution step supporting each label;
- **Common false starts:** plausible approaches that do not expose the central mechanism.

Every generated year must pass validation requiring at least:

- two primary techniques per problem;
- two evidence entries per problem;
- a substantive key observation;
- a substantive solution architecture;
- a complete five-dimensional difficulty profile.

## Find Similar

For a selected problem with structured solution metadata, similarity uses these maximum weights:

| Component | Weight |
|---|---:|
| Primary-technique overlap | 70 |
| All-technique overlap | 40 |
| Solution-architecture similarity | 45 |
| Concept overlap | 20 |
| Topic overlap | 15 |
| Five-dimensional difficulty similarity | 25 |
| Same broad area | 5 |

This makes proof method and architecture more important than surface subject. Records that have not yet been solution-analyzed fall back to the weaker statement-based metadata.

## GitHub automation

`.github/workflows/review-historical-putnam.yml` runs three times daily and processes the newest incomplete year. It:

1. downloads that year’s problem and solution TeX;
2. sends each solution to GitHub Models using the workflow’s short-lived `GITHUB_TOKEN` and `models: read` permission;
3. requires strict structured output;
4. validates every record;
5. runs the repository checks;
6. commits the completed year and rebuilt browser overlay directly to `main`.

The workflow fills missing statement records from the problem archive while it processes each year. Each year is stored independently in `data/reviews/YYYY.json`, making corrections and manual upgrades auditable.

## Confidence

Manually reviewed recent records generally use confidence values around 0.94–0.97 because both official solutions and official score data are available. Automated solution analyses are capped at 0.84 and remain visibly distinguished until manually checked. Confidence describes the reliability of the metadata process, not the probability that a subjective label is uniquely correct.
