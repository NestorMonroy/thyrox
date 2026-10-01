// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
var r=/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,kut=256,Vun=/[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;function Qte(e){return e.length>0&&e.length<=256&&!Vun.test(e)}function oFe(e){return e.length<=256&&/^[A-Za-z0-9_:.-]+$/.test(e)}function Eb(e){return t(e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"))}function t(e){return e.replace(r,(n)=>`&#${n.charCodeAt(0)};`)}function iz(e){return e.replaceAll("<","&lt;").replaceAll(">","&gt;")}function Cl(e){return t(iz(String(e??"")))}function bce(e){return Cl(e).replaceAll('"',"&quot;")}
export{kut,Vun,Qte,oFe,Eb,iz,Cl,bce};
