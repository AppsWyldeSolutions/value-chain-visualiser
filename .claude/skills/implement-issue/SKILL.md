---
name: implement-issue
description: Implement a GitHub issue end to end and open a pull request
argument-hint: [issue-number]
disable-model-invocation: true
---

Implement GitHub issue $ARGUMENTS.

1. Read it with `gh issue view $ARGUMENTS`. If acceptance criteria are missing, stop and ask.
2. Create branch `feat/$ARGUMENTS-<slug>` from an up-to-date main.
3. Write failing tests for each acceptance criterion first.
4. Implement until `npm run verify` and `npm run e2e` pass.
5. Add a changeset if a public API changed.
6. Open a PR with `gh pr create`: summary, screenshots if visuals changed, and a checklist
   of the acceptance criteria with pass/fail.