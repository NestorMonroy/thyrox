// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
var r=[{id:"gh-api-readonly",event:"PreToolUse",matcher:"Bash",interpreter:"python3",filename:"gh-api-readonly.py",maxBytes:262144,digests:[{sha256:"86ad9d3feb974100056791880d197eed8d909e43b61c66d38302c47fed6e0821",bytes:132430,label:"current"},{sha256:"76a07075b20f74b8d6ab10d1f3ede0559fa894b74d28e20de0675ce6a22d9446",bytes:130745,label:"legacy"}],requires:["python3"]},{id:"ruff-autofix",event:"PostToolUse",matcher:"Edit|Write",interpreter:"python3",filename:"post-edit-lint.py",maxBytes:65536,digests:[{sha256:"19f23b2c0886f2eeb63af3bc2070d32cdd1fe5b5b6a82f645839acced32e11fc",bytes:963,label:"current"},{sha256:"12351c8160a3a0299cd6e0cf4571bff87226e0dd9b95e248e678ce453fc8ebd0",bytes:942,label:"legacy"}],requires:["python3","ruff"]}];function MFn(e){for(let t of r){let a=t.digests.find((o)=>o.sha256===e);if(a)return{template:t,label:a.label}}return}function t_e(e){return r.find((t)=>t.id===e)}function Vst(e){return e.event==="PreToolUse"}
export{MFn,t_e,Vst};
