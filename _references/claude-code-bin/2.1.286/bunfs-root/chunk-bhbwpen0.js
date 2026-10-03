// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ee}from"/$bunfs/root/chunk-ctczby4m.js";import{y,f}from"/$bunfs/root/chunk-gm7a1q0z.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Ae,J0,ce}from"/$bunfs/root/chunk-4hjp8tw4.js";function jnt(){try{return!1}catch(e){return d(ee(e)),!1}}var i=20,u=i+1,rfo=10,m=1209600000,chr=[{text:"Showing fewer prompt suggestions"},{text:" \xB7 use one to bring them back",dim:!0}];function DMn(){let e=ce();if(r(e)<i)return!1;if(a.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION===!0)return!1;if(jnt())return!1;if(Date.now()-Date.parse(e.firstStartTime??"1970-01-01")<m)return!1;return!0}function MAt(e,o,n){if(e){if(n)n.unusedInARow=0;p(o,!1);return}if(!n||r(ce())>=i)return;if(n.unusedInARow++,n.unusedInARow>=i)n.unusedInARow=0,Ae(_,o)}function ofo(e,o){if(o)o.unusedInARow=0;p(e,!0)}function dhr(e){if(!c(ce())||!DMn())return!1;return Ae((o)=>c(o)?{...o,promptSuggestionUnusedStreak:u}:o,e),y("prompt_suggestion_back_off_notice"),!0}function p(e,o){let n=r(ce());if(n===0)return;if(!DMn()){Ae(l,e);return}let g={was_notice_claimed:n===u,via_config_toggle:o};J0(l,e).then((s)=>{if(s)y("prompt_suggestion_back_off_end",g);else f("prompt_suggestion_back_off_end","reset_unconfirmed",g)}).catch((s)=>t(`Prompt suggestion back-off: could not log the end event: ${s}`,{level:"error"}))}function l(e){return r(e)===0?e:{...e,promptSuggestionUnusedStreak:0}}function _(e){return r(e)>=i?e:{...e,promptSuggestionUnusedStreak:i}}function c(e){let o=r(e);return o>=i&&o!==u}function r(e){let o=e.promptSuggestionUnusedStreak;return typeof o==="number"&&Number.isFinite(o)?o:0}
export{jnt,rfo,chr,DMn,MAt,ofo,dhr};
