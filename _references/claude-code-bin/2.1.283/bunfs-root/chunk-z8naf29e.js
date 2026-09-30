// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{xz}from"/$bunfs/root/chunk-jwddn0q9.js";import{Tn}from"/$bunfs/root/chunk-pbnxt79v.js";import{gG}from"/$bunfs/root/chunk-xw9hdeee.js";function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function BLe(e){if(e.loadedFrom==="syncedSkills")return!fPr();return i(e)}function fPr(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||xz()}function qin(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function SMt(e){return{description:Yin(e.description),argumentHint:Kin(e.argumentHint),whenToUse:Kin(e.whenToUse),argumentNames:e.argumentNames.map(Yin)}}function SCo(e){return{...SMt(e),displayName:Kin(e.displayName),argumentHint:e.argumentHint===void 0?void 0:Tn(e.argumentHint),fallback:void 0}}function Kin(e){return e===void 0?void 0:Yin(e)}function Yin(e){return gG(Tn(e))}function Xin(e){return gG(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{BLe,fPr,qin,SMt,SCo,Kin,Yin,Xin};
