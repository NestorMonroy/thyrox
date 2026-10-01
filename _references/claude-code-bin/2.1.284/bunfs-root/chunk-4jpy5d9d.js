// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{te}from"/$bunfs/root/chunk-31aa9k3a.js";import{_,p}from"/$bunfs/root/chunk-q5gkv7dz.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{ke,C0,ce}from"/$bunfs/root/chunk-swk3rjnt.js";function btt(){try{return!1}catch(e){return d(te(e)),!1}}var i=20,u=i+1,oco=10,m=1209600000,Afr=[{text:"Showing fewer prompt suggestions"},{text:" \xB7 use one to bring them back",dim:!0}];function IIn(){let e=ce();if(r(e)<i)return!1;if(a.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION===!0)return!1;if(btt())return!1;if(Date.now()-Date.parse(e.firstStartTime??"1970-01-01")<m)return!1;return!0}function Zkt(e,o,n){if(e){if(n)n.unusedInARow=0;c(o,!1);return}if(!n||r(ce())>=i)return;if(n.unusedInARow++,n.unusedInARow>=i)n.unusedInARow=0,ke(S,o)}function sco(e,o){if(o)o.unusedInARow=0;c(e,!0)}function Cfr(e){if(!l(ce())||!IIn())return!1;return ke((o)=>l(o)?{...o,promptSuggestionUnusedStreak:u}:o,e),_("prompt_suggestion_back_off_notice"),!0}function c(e,o){let n=r(ce());if(n===0)return;if(!IIn()){ke(g,e);return}let f={was_notice_claimed:n===u,via_config_toggle:o};C0(g,e).then((s)=>{if(s)_("prompt_suggestion_back_off_end",f);else p("prompt_suggestion_back_off_end","reset_unconfirmed",f)}).catch((s)=>t(`Prompt suggestion back-off: could not log the end event: ${s}`,{level:"error"}))}function g(e){return r(e)===0?e:{...e,promptSuggestionUnusedStreak:0}}function S(e){return r(e)>=i?e:{...e,promptSuggestionUnusedStreak:i}}function l(e){let o=r(e);return o>=i&&o!==u}function r(e){let o=e.promptSuggestionUnusedStreak;return typeof o==="number"&&Number.isFinite(o)?o:0}
export{btt,oco,Afr,IIn,Zkt,sco,Cfr};
