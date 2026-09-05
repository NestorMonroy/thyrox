// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ie}from"/$bunfs/root/chunk-8xbkt625.js";import{tee,Hp}from"/$bunfs/root/chunk-539th5b3.js";import{Tbt}from"/$bunfs/root/chunk-bkjsth7q.js";import{ft}from"/$bunfs/root/chunk-sh3w3snz.js";var n="\x1B]8;;",o="\x07";function Xg(e,r,i){let t=r===void 0?void 0:ft(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(tee()??!0)||(i?.supportsHyperlinks??Hp()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?Tbt(i.themeName):!1)?ie.blue:ie.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{Xg};
