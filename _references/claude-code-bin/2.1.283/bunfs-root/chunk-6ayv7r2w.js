// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{pe}from"/$bunfs/root/chunk-vrkqvgpe.js";import{qbe,Dy}from"/$bunfs/root/chunk-j4103pzn.js";import{Ytn}from"/$bunfs/root/chunk-zw18v94q.js";import{wt}from"/$bunfs/root/chunk-pbnxt79v.js";var n="\x1B]8;;",o="\x07";function W_(e,r,i){let t=r===void 0?void 0:wt(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(qbe()??!0)||(i?.supportsHyperlinks??Dy()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?Ytn(i.themeName):!1)?pe.blue:pe.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{W_};
