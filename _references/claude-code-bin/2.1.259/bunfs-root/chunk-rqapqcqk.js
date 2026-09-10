// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{ae}from"/$bunfs/root/chunk-8mbwgjdd.js";import{zee,Cp}from"/$bunfs/root/chunk-4btmh39m.js";import{lSt}from"/$bunfs/root/chunk-0f1244y5.js";import{Ht}from"/$bunfs/root/chunk-7xxnrgeg.js";var n="\x1B]8;;",o="\x07";function fh(e,r,i){let t=r===void 0?void 0:Ht(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(zee()??!0)||(i?.supportsHyperlinks??Cp()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?lSt(i.themeName):!1)?ae.blue:ae.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{fh};
