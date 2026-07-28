# Putnam classification methodology

## Review order

Problems are reviewed one complete exam year at a time, beginning with 2025 and moving backward. An auto-generated record remains labeled as an initial or machine classification until its official solution has been read and its metadata has been replaced by a year-specific reviewed override.

Current progress:

- 2025: solution-reviewed
- 2024: next review year

## Sources

For reviewed years, classifications use:

1. the official MAA problem and solution document;
2. the official MAA per-problem score distribution, when published;
3. the existing statement and broad subject tags in the generated historical catalog.

The application stores original summaries of solution structure and short evidence descriptions. It does not copy full official solutions into the catalog.

## Difficulty calibration

For 2025, the official announcement provides score frequencies on each problem for the top 507 participants. The mean score on each problem is calculated by counting a non-submission as zero, matching its contribution to the exam total.

The empirical difficulty is

```text
empirical = 1 + 9 × (1 − mean_score / 10)
```

This maps a mean score of 10 to difficulty 1 and a mean score of 0 to difficulty 10.

Because the published table covers the top 507 participants rather than the entire field, the empirical value is shrunk toward a conservative exam-position prior:

| Position | Prior |
|---|---:|
| A1/B1 | 2.5 |
| A2/B2 | 4.0 |
| A3/B3 | 5.5 |
| A4/B4 | 6.5 |
| A5/B5 | 7.5 |
| A6/B6 | 8.5 |

The overall rating is

```text
overall = 65% × empirical + 35% × position_prior
```

rounded to the nearest tenth.

The four component ratings are then reviewed from the official proof:

- **Insight:** difficulty of discovering the key observation or construction;
- **Technical:** algebraic, computational, or case-management burden after the idea is known;
- **Prerequisite:** depth of mathematical background needed;
- **Proof writing:** difficulty of organizing a complete rigorous argument.

These component ratings are not mechanically derived from problem number.

## Technique classification

Every reviewed problem distinguishes:

- **Primary techniques:** indispensable ideas driving the proof;
- **Secondary techniques:** tools used to execute or justify the main idea;
- **Solution archetype:** a subject-independent description of the proof architecture;
- **Technique evidence:** a short explanation of the exact step in the official solution supporting each primary label;
- **Common false starts:** plausible approaches that do not expose the central mechanism.

A problem is marked `solution_reviewed` only when it has at least:

- two primary techniques;
- two evidence entries;
- a substantive key observation;
- a substantive solution architecture;
- a reviewed difficulty profile.

## Find Similar

For a selected reviewed problem, similarity uses a structured score with these maximum weights:

| Component | Weight |
|---|---:|
| Primary-technique overlap | 70 |
| All-technique overlap | 40 |
| Solution-architecture similarity | 45 |
| Concept overlap | 20 |
| Topic overlap | 15 |
| Five-dimensional difficulty similarity | 25 |
| Same broad area | 5 |

This makes proof method and architecture more important than surface subject. For years not yet solution-reviewed, the system falls back to the weaker generated metadata, so similarity quality will improve progressively as more years are reviewed.

## Confidence

Reviewed 2025 records use confidence values from 0.94 to 0.97 because both official solutions and official score data are available. Confidence reflects the reliability of the metadata process, not the probability that every subjective rating is uniquely correct.
