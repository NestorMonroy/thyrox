// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
var n=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,eft=256,Ffn=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function One(e){return e.length>0&&e.length<=256&&!Ffn.test(e)}function oUe(e){return e.length<=256&&/^[A-Za-z0-9_:.-]+$/.test(e)}function DA(e){return l8e(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function l8e(e){return e.replace(n,(t)=>`&#${t.charCodeAt(0)};`)}function PG(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function Ph(e){return l8e(PG(String(e??"")))}function V5n(e){return Ph(e).replaceAll('"',"&quot;")}
export{eft,Ffn,One,oUe,DA,l8e,PG,Ph,V5n};
