// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
var lf={output_tokens_details:{thinking_tokens:0},input_tokens:0,cache_creation_input_tokens:0,cache_read_input_tokens:0,output_tokens:0,server_tool_use:{web_search_requests:0,web_fetch_requests:0},service_tier:"standard",cache_creation:{ephemeral_1h_input_tokens:0,ephemeral_5m_input_tokens:0},inference_geo:"",iterations:[],speed:"standard"};function mee(e){if(e==null||typeof e.input_tokens!=="number")return;if(typeof e.output_tokens==="number")return e;return e.output_tokens==null?{...e,output_tokens:0}:void 0}
export{lf,mee};
