// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{nz}from"/$bunfs/root/chunk-esvkqvk3.js";import{Tn}from"/$bunfs/root/chunk-c01w1545.js";import{y4}from"/$bunfs/root/chunk-v4q9tmx5.js";function i(e){if(e.loadedFrom===void 0)return Boolean(e.isMcp);switch(e.loadedFrom){case"skills":case"commands_DEPRECATED":case"plugin":case"managed":case"bundled":return!1;case"syncedSkills":case"mcp":case"memoryStore":return!0}}function CMe(e){if(e.loadedFrom==="syncedSkills")return!ZEr();return i(e)}function ZEr(){return Boolean(a.CLAUDE_CODE_REMOTE)||Boolean(a.CLAUDE_CODE_IS_COWORK)||nz()}function ynn(){return{hooks:void 0,allowedTools:[],disallowedTools:[],executionContext:void 0,agent:void 0,background:void 0,model:void 0,effort:void 0,shell:void 0,paths:void 0,fallback:void 0,createdBy:void 0,displayName:void 0,metadata:void 0}}function GIt(e){return{description:bnn(e.description),argumentHint:_nn(e.argumentHint),whenToUse:_nn(e.whenToUse),argumentNames:e.argumentNames.map(bnn)}}function zyo(e){return{...GIt(e),displayName:_nn(e.displayName),argumentHint:e.argumentHint===void 0?void 0:Tn(e.argumentHint),fallback:void 0}}function _nn(e){return e===void 0?void 0:bnn(e)}function bnn(e){return y4(Tn(e))}function Snn(e){return y4(e.replace(/\p{Cc}/gu,(n)=>n==="\t"||n===`
`||n==="\r"?n:""))}
export{CMe,ZEr,ynn,GIt,zyo,_nn,bnn,Snn};
