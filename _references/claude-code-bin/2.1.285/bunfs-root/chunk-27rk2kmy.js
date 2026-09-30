// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ee}from"/$bunfs/root/chunk-vqpmen5t.js";import{y,f}from"/$bunfs/root/chunk-dpwtsz9f.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{Ae,xD,ce}from"/$bunfs/root/chunk-f74xvn8g.js";function att(){try{return!1}catch(e){return u(ee(e)),!1}}var i=20,g=i+1,Ylo=10,m=1209600000,Ypr=[{text:"Showing fewer prompt suggestions"},{text:" \xB7 use one to bring them back",dim:!0}];function ePn(){let e=ce();if(r(e)<i)return!1;if(a.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION===!0)return!1;if(att())return!1;if(Date.now()-Date.parse(e.firstStartTime??"1970-01-01")<m)return!1;return!0}function Dkt(e,o,n){if(e){if(n)n.unusedInARow=0;p(o,!1);return}if(!n||r(ce())>=i)return;if(n.unusedInARow++,n.unusedInARow>=i)n.unusedInARow=0,Ae(_,o)}function Xlo(e,o){if(o)o.unusedInARow=0;p(e,!0)}function Xpr(e){if(!d(ce())||!ePn())return!1;return Ae((o)=>d(o)?{...o,promptSuggestionUnusedStreak:g}:o,e),y("prompt_suggestion_back_off_notice"),!0}function p(e,o){let n=r(ce());if(n===0)return;if(!ePn()){Ae(c,e);return}let l={was_notice_claimed:n===g,via_config_toggle:o};xD(c,e).then((s)=>{if(s)y("prompt_suggestion_back_off_end",l);else f("prompt_suggestion_back_off_end","reset_unconfirmed",l)}).catch((s)=>t(`Prompt suggestion back-off: could not log the end event: ${s}`,{level:"error"}))}function c(e){return r(e)===0?e:{...e,promptSuggestionUnusedStreak:0}}function _(e){return r(e)>=i?e:{...e,promptSuggestionUnusedStreak:i}}function d(e){let o=r(e);return o>=i&&o!==g}function r(e){let o=e.promptSuggestionUnusedStreak;return typeof o==="number"&&Number.isFinite(o)?o:0}
export{att,Ylo,Ypr,ePn,Dkt,Xlo,Xpr};
