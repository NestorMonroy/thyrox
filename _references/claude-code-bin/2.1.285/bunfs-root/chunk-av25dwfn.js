// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ER,GBo,o7}from"/$bunfs/root/chunk-mbk7s6pb.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{Ye}from"/$bunfs/root/chunk-g6a51st9.js";import{Wpn}from"/$bunfs/root/chunk-rpv612mp.js";function CF(i){return a.CLAUDE_CODE_DISABLE_BUNDLED_SKILLS||(i??Ye()).disableBundledSkills===!0}var Z4n="allow_bundled_skills";function $Ce(){return!ER(Z4n)}function t(){return GBo()??Wpn}function Zq(i){return $Ce()&&!t().includes(i)}function g6(i,e){return CF(e)||Zq(i)}function eLo(){return o7(Z4n,"Bundled skills","are")}function Bpn(i){let e=$Ce();return`${CF(i)}:${e}:${e?t().join(","):""}`}function jpn(i,e){return i.type==="prompt"&&i.source==="builtin"&&g6(i.name,e)}
export{CF,Z4n,$Ce,Zq,g6,eLo,Bpn,jpn};
