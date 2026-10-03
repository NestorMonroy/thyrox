// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{$R,kGo,L7}from"/$bunfs/root/chunk-av210xrn.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Je}from"/$bunfs/root/chunk-j27hwf9z.js";import{kgn}from"/$bunfs/root/chunk-2rm23w0s.js";function nU(i){return a.CLAUDE_CODE_DISABLE_BUNDLED_SKILLS||(i??Je()).disableBundledSkills===!0}var rYn="allow_bundled_skills";function IRe(){return!$R(rYn)}function t(){return kGo()??kgn}function AK(i){return IRe()&&!t().includes(i)}function $6(i,e){return nU(e)||AK(i)}function HUo(){return L7(rYn,"Bundled skills","are")}function vgn(i){let e=IRe();return`${nU(i)}:${e}:${e?t().join(","):""}`}function Egn(i,e){return i.type==="prompt"&&i.source==="builtin"&&$6(i.name,e)}
export{nU,rYn,IRe,AK,$6,HUo,vgn,Egn};
