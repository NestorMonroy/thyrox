// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Tn}from"/$bunfs/root/chunk-pn8bw28z.js";import{fO}from"/$bunfs/root/chunk-wk88sc60.js";import{PG}from"/$bunfs/root/chunk-75dhkvs9.js";function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function rUe(e){if(e.loadedFrom==="syncedSkills")return!G5n();return i(e)}function G5n(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||fO()}function Lfn(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function xFt(e){return{description:IG(e.description),argumentHint:Nfn(e.argumentHint),whenToUse:Nfn(e.whenToUse),argumentNames:e.argumentNames.map(IG)}}function m$o(e){return{...xFt(e),displayName:Nfn(e.displayName),argumentHint:e.argumentHint===void 0?void 0:Tn(e.argumentHint),fallback:void 0}}function Nfn(e){return e===void 0?void 0:IG(e)}function IG(e){return PG(Tn(e))}function $fn(e){return PG(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{rUe,G5n,Lfn,xFt,m$o,Nfn,IG,$fn};
