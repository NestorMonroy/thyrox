// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ue}from"/$bunfs/root/chunk-zbq9bkhj.js";import{Ace,rg}from"/$bunfs/root/chunk-441zkcmg.js";import{Q1t}from"/$bunfs/root/chunk-nzydtwjt.js";import{yt}from"/$bunfs/root/chunk-qk2a968b.js";var n="\x1B]8;;",o="\x07";function vy(e,r,i){let t=r===void 0?void 0:yt(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(Ace()??!0)||(i?.supportsHyperlinks??rg()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?Q1t(i.themeName):!1)?ue.blue:ue.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{vy};
