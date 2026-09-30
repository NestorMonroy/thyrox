// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
var n=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,iut=256,sun=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function Yte(e){return e.length>0&&e.length<=256&&!sun.test(e)}function B$e(e){return e.length<=256&&/^[A-Za-z0-9_:.-]+$/.test(e)}function SA(e){return G6e(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function G6e(e){return e.replace(n,(t)=>`&#${t.charCodeAt(0)};`)}function t2(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function ph(e){return G6e(t2(String(e??"")))}function jqn(e){return ph(e).replaceAll('"',"&quot;")}
export{iut,sun,Yte,B$e,SA,G6e,t2,ph,jqn};
