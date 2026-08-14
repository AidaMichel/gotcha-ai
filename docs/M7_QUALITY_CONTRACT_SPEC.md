# M7 — AI-Assisted Quality Contract

Status: Draft  
Milestone: 7  
Branch: `milestone-7-quality-contract`

## 1. Goal

M7 adds the first AI-assisted product layer to Gotcha.

Until now, Gotcha can attack an evaluator, find survivors, rank them, propose a protection, and re-attack.

But the user still has to define quality manually.

M7 changes that.

A user should be able to teach Gotcha what “good” means using:

- a plain-English task description
- a small set of examples
- good / bad judgments
- optional A/B preferences
- optional short notes

Gotcha uses AI to propose a structured **Quality Contract**.

The user then reviews that contract and explicitly confirms, edits, or rejects its rules.

The core M7 flow is:

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
