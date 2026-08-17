# Real-world readiness

This document records why the game is expected to fit a real 6–10 person dinner, what has
been verified in software, and what still requires a human kitchen pilot.

## Measured evidence

The release validator completed 100 deterministic full-game simulations: 20 runs for every
supported crew size. Every run reached the treasure finale, completed all 72 assigned tasks,
used every essential ingredient, kept optional ingredients optional, and had no pure waiting
step.

| Crew | Runs | Minimum | Average | Maximum | Maximum task-marker spread |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 20 | 253 min | 257 min | 268 min | 1 |
| 7 | 20 | 266 min | 269 min | 275 min | 1 |
| 8 | 20 | 266 min | 270 min | 282 min | 1 |
| 9 | 20 | 278 min | 285 min | 299 min | 1 |
| 10 | 20 | 285 min | 290 min | 297 min | 1 |

The range is 4 h 13 min to 4 h 59 min, including the six planned eating windows. The model
uses real timer durations, measured round-robin turn time, concurrent task execution and the
configured eating periods.

A second focused audit ran 20 complete dinners with one representative eight-player crew
model. Durations were 266–278 minutes (average 269.9), with 228–252 unique events and
187–200 completed round-robin turns. Every run served all six courses, completed exactly
72 unique tasks, used every essential ingredient, selected exactly one spirit for the alcoholic
cocktail, retained the alcohol-free ingredients, and finished with no pure waiting step.
Between 49 and 71 turns per game took place productively while kitchen timers were running;
up to four tasks ran concurrently. The maximum turn spread was two and the maximum
task-marker spread was one.

The focused audit also validates chronological history entries, assignment/start/completion
order for every task, timer completion boundaries, all 36 location core tasks, automatic crew
splits and reunions, unique event draws, varied role rosters and a final treasure event.

## Why the kitchen flow should work

- Exactly one person leads the tablet turn; assigned kitchen tasks may continue in parallel.
- Starting a timer never blocks the next turn. Five-minute, one-minute and completion alerts
  remain in the shared task view.
- A group moves only after the location action target and its local work gate are satisfied.
- Core task chains cover planning, preparation, cooking, checking, serving and cleanup; every
  simulation completed all 72 assigned tasks.
- All 20 prepared ingredient effects are executable game rules, including follow-up choices,
  delayed bonuses and deck manipulation. Every event archetype has a distinct mechanical
  variant at each of the six locations.
- The long roasting-bag phase starts early enough for its oven time to be filled with turns,
  table work and challenges.
- The ingredient planner scales rough quantities for 6–10 people and assigns every essential
  item to a course; only unselected spirits and the second ice-cream flavour may remain unused.
  The cocktail chapter requires the crew to choose one spirit and produces both an alcoholic
  and a clearly separated alcohol-free drink.
- The required equipment is limited to the stated kitchen: oven and roasting bag, hob, mixer,
  knives, boards, pots, pans and normal serving equipment.

## Safety assumptions

Cards never override packaging, appliance or local safety guidance. Raw meat must remain
separate from ready-to-eat food; hands, tools and surfaces must be cleaned after contact. The
final roast check instructs the crew to verify thorough, even cooking and, when in doubt, at
least 70 °C for two minutes throughout with a clean meat thermometer. This follows the
[German Federal Institute for Risk Assessment (BfR) household food-safety guidance](https://www.bfr.bund.de/fragen-und-antworten/thema/lebensmittelinfektionen-im-privathaushalt-quellen-erkennen-risiken-vermeiden/).

The game does not diagnose allergies, intolerances or medical dietary restrictions. A public
group must check these before play even though the original target group has none specified.

## Pilot protocol before a public event

Run one full dinner with 6–8 representative players and record:

1. Actual start, serving and eating-end time for every course.
2. Every moment when nobody has a useful turn, task or eating activity.
3. Oven and hob congestion, missing utensils and unsafe crossings between raw and ready food.
4. Timer alerts that were missed, late or unclear.
5. Leftover essential ingredients and any unexpectedly short portion.
6. Task-marker spread and whether assignments felt fair.
7. Any instruction that needed host explanation.

Accept the pilot when it finishes within 240–300 minutes, has no idle interval longer than two
minutes, serves all six courses safely, uses every essential ingredient, and requires no rule
repair. A software simulation establishes internal consistency and timing feasibility; only this
human pilot can provide empirical proof of the exact kitchen, ingredients and group dynamics.
