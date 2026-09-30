// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
function e(r,t,a,i=!1){return{path:`artifact-type/reference/${r}`,inlinedByCreate:t,printed:a,readByKit:i}}var B8n=new Map([["design",[e("format.md",!0,!0,!0),e("design-system-components.md",!0,!1,!0),e("fonts.md",!1,!0),e("craft.md",!1,!0)]],["migrated-design",[e("format.md",!0,!0),e("fonts.md",!1,!0),e("craft.md",!1,!0)]],["slides",[e("format.md",!0,!0,!0),e("fonts.md",!0,!0,!0),e("craft.md",!1,!0),e("deck-files.md",!1,!1,!0)]]]),s=[e("format.md",!1,!0),e("fonts.md",!1,!0),e("craft.md",!1,!0)];function n(r){return(r===void 0?void 0:B8n.get(r))??s}function Pzr(r){return n(r).filter((t)=>t.inlinedByCreate).map((t)=>t.path)}function Mhn(r){return n(r).filter((t)=>t.printed).map((t)=>t.path)}function Hzr(r){return n(r).filter((t)=>t.readByKit).map((t)=>t.path)}
export{B8n,Pzr,Mhn,Hzr};
