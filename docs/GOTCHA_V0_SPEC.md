# Gotcha V0 Specification

## Product Thesis

Gotcha finds convincing bad AI behavior that the current definition of "good" fails to reject.

Gotcha is a standalone, domain-independent, open-source AI quality tool.

It helps people make quality explicit, deliberately attack that definition, discover what their current checks fail to catch, and strengthen those checks.

---

## Hook

Your evals said "pass." Gotcha disagrees.

---

## Core Promise

Within five minutes, Gotcha should help a user discover at least one meaningful AI failure that their current quality checks would allow through.

The user should not need to understand:

- eval frameworks
- LLM judges
- datasets
- YAML
- evaluation metrics
- prompting techniques
- mutation testing
- AI evaluation terminology

Gotcha should translate human product judgment into testable and attackable AI quality.

---

## Product Philosophy

Quality should be:

### Teachable

A human can demonstrate what good and bad behavior looks like.

### Testable

Gotcha can turn that judgment into repeatable quality checks.

### Attackable

Gotcha deliberately tries to prove those checks insufficient.

### Improvable

Meaningful failures can become stronger permanent protections.

---

## Who Gotcha Is For

Gotcha should eventually work for many types of AI products, including:

- AI agents
- customer-support assistants
- RAG applications
- copilots
- extraction systems
- recommendation systems
- workflow automation
- tool-using AI systems
- financial assistants
- medical assistants
- legal assistants
- educational assistants
- domain-specific AI products

Gotcha's core must not assume any particular industry or use case.

---

# Core User Loop

## 1. TEACH

The user describes what their AI does.

They provide a small number of examples showing good and bad behavior.

The initial interaction should feel simple enough for a nontechnical user.

Example:

> What does your AI do?

> "It schedules meetings from natural-language requests."

Then the user can provide example AI outputs and mark them:

- Good
- Bad
- Prefer A
- Prefer B
- Neither

---

## 2. CONTRACT

Gotcha proposes what it believes "good" means.

This becomes the proposed Quality Contract.

Gotcha must not pretend to know product rules that are unsupported by the evidence.

The proposed contract should distinguish between:

### Confirmed or high-confidence rules

Example:

> The scheduled meeting time must match the time requested by the user.

### Uncertain product decisions

Example:

> If the user does not provide a location, may the assistant infer one?

---

## 3. CONFIRM

The human reviews the proposed Quality Contract.

They can:

- confirm a rule
- edit a rule
- reject a rule
- answer an unresolved question
- change its severity

Human confirmation is authoritative.

Gotcha must treat user examples as evidence, not unquestionable truth.

---

## 4. ATTACK

Gotcha deliberately generates convincing bad AI behavior.

The goal is not to generate random incorrect text.

The goal is to create realistic failures that:

- a real AI system could plausibly produce
- violate the Quality Contract
- may fool a weak evaluator
- are difficult enough to reveal a useful blind spot

---

## 5. RANK

Gotcha may generate many attacks internally.

The user should see only the most meaningful surviving failures.

The V0 target is:

3 to 5 strong findings.

Gotcha should prefer high precision over high recall.

Three excellent findings are better than thirty noisy findings.

---

## 6. GOTCHA

A Gotcha finding occurs when a convincing bad behavior survives the user's current quality checks.

Example:

User input:

> Schedule a meeting with Sara on Tuesday at 3 PM.

Correct behavior:

> Meeting scheduled with Sara on Tuesday at 3 PM.

Bad mutated behavior:

> Meeting scheduled with Sara on Tuesday at 4 PM (requested: 3 PM).

Current evaluator:

> PASS

Gotcha should explain the problem in plain language:

> Your checks accepted the correct person and day but failed to verify that the scheduled time matched the time requested by the user.

---

## 7. CATCH THIS

For a meaningful survivor, Gotcha proposes a concrete stronger quality check.

The recommendation must be specific and testable.

Bad recommendation:

> Improve scheduling accuracy.

Good recommendation:

> The actual scheduled meeting time must match the time requested by the user.

The user can approve or reject the proposed protection.

---

## 8. RE-ATTACK

After applying the proposed protection, Gotcha attacks the quality system again.

The user should see whether the protection actually improved the system.

Example:

Before fix:

9 bad behaviors survived.

After fix:

2 bad behaviors survived.

Gotcha should demonstrate improvement rather than merely recommend it.

---

# Quality Contract

The Quality Contract is the explicit definition of expected AI behavior.

Each rule should internally contain information such as:

- rule
- severity
- confidence
- supporting evidence
- unresolved uncertainty

Example:

```json
{
  "rule": "The scheduled meeting time must match the time requested by the user",
  "severity": "critical",
  "confidence": 0.94,
  "evidence": ["example_1", "example_4"],
  "uncertainty": null
}
```
