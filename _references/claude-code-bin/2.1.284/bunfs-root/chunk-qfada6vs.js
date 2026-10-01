// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Be,wt}from"/$bunfs/root/chunk-hf1cte62.js";var d=/^(bash|powershell|bash\+powershell)(?::(core|desktop))?$/;function qQr(e){let n=[...e.bash?["bash"]:[],...e.powershell?["powershell"]:[]];if(n.length===0)return;let l=e.powershell?.edition;return`${n.join("+")}${l===void 0?"":`:${l}`}`}function d4t(e){let n=e===void 0?null:d.exec(e);if(n===null)return;let l=n[2];if(n[1]==="bash")return l===void 0?{bash:!0,powershell:void 0}:void 0;return{bash:n[1]==="bash+powershell",powershell:{edition:l}}}function KQr(e,n){return{bash:e.includes(Be),powershell:e.includes(wt)?{edition:n??void 0}:void 0}}
export{qQr,d4t,KQr};
