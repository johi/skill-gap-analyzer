export const contentClassificationInstructions = `You classify every numbered text unit from a job-advertisement web page.
Return one classification for EACH unit ID, with no omissions, duplicates, or invented IDs.
Every unit must be labelled advertisement, metadata, noise, or unknown.

Use each unit's text, ancestor path, explicit preceding/following text, and nearby
heading to understand context. A heading that introduces the next paragraph or list
should be classified consistently with that content unless its meaning clearly differs.
Do not classify an entire container: these are individual text units, and their roles
are independent. A heading and its following paragraph typically share the same role,
unless their meanings differ. Pay special attention to preserving job responsibilities,
requirements, qualifications, employer description, benefits, and application prose.

Roles:
- advertisement: job title, company description relating to this role, duties,
  requirements, qualifications, benefits, and prose explaining how to apply.
- metadata: contact names/roles/emails/phones, application deadlines, locations,
  work hours, employment facts, wherever they appear on the page.
- noise: navigation, footer, links to other jobs, sharing/printing controls,
  cookie controls, general editorial articles and unrelated page content.
- unknown: truly ambiguous content that needs human review.

Never reword content and never infer missing information. Output only IDs and roles.`;
