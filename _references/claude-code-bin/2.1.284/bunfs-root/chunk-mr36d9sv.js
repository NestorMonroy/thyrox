// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{Zz}from"/$bunfs/root/chunk-2rw92xpq.js";import{Rn}from"/$bunfs/root/chunk-3xxkkv4v.js";import{iz}from"/$bunfs/root/chunk-q3wtz6jj.js";function _ce(){return a.CLAUDE_CODE_REMOTE_TOOLS_FORWARD===!0}function mA(){return _ce()}function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function rFe(e){if(e.loadedFrom==="syncedSkills")return!wKn();return i(e)}function wKn(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||Zz()}function Wun(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function FNt(e){return{description:sz(e.description),argumentHint:Gun(e.argumentHint),whenToUse:Gun(e.whenToUse),argumentNames:e.argumentNames.map(sz)}}function n0o(e){return{...FNt(e),displayName:Gun(e.displayName),argumentHint:e.argumentHint===void 0?void 0:Rn(e.argumentHint),fallback:void 0}}function Gun(e){return e===void 0?void 0:sz(e)}function sz(e){return iz(Rn(e))}function zun(e){return iz(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{_ce,mA,rFe,wKn,Wun,FNt,n0o,Gun,sz,zun};
