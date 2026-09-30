// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ef}from"/$bunfs/root/chunk-bpe337kn.js";import{randomUUID as s}from"crypto";function LY(r,e){return{type:"control_response",response:{subtype:"success",request_id:r,response:e}}}function Ej(r,e){return{type:"control_response",response:{subtype:"error",request_id:r,error:e}}}function kj(r,e,o){return{type:"result",subtype:"error_during_execution",duration_ms:0,duration_api_ms:0,is_error:!0,num_turns:0,stop_reason:null,session_id:r,total_cost_usd:0,usage:Ef,modelUsage:{},permission_denials:[],uuid:s(),errors:e,...o!==void 0&&{user_message_uuid:o}}}
export{LY,Ej,kj};
