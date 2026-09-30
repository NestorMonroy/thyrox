// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ue}from"/$bunfs/root/chunk-g5r8wnkm.js";import{l_e,Dh}from"/$bunfs/root/chunk-y6k5f96p.js";import{L7t}from"/$bunfs/root/chunk-md7p1res.js";import{_t}from"/$bunfs/root/chunk-c01w1545.js";var n="\x1B]8;;",o="\x07";function A_(e,r,i){let t=r===void 0?void 0:_t(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(l_e()??!0)||(i?.supportsHyperlinks??Dh()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?L7t(i.themeName):!1)?ue.blue:ue.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{A_};
