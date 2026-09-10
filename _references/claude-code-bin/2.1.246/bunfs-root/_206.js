// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{b1b as e,c1b as n}from"/$bunfs/root/_624.js";import{Tbd as T}from"/$bunfs/root/_811.js";import{ncd as r}from"/$bunfs/root/_812.js";import{xxd as i}from"/$bunfs/root/_837.js";function a(){if(r.CLAUDE_CODE_FORCE_STRIKETHROUGH)return!0;let t=r.TERM;if(r.TERM_PROGRAM==="Apple_Terminal"||t==="linux")return!1;return R.has(r.TERM_PROGRAM??"")||e.isGhostty()||e.isMintty()||e.isJetBrainsIdeTerminal()||r.LC_TERMINAL==="iTerm2"||!!t?.includes("kitty")||!!t?.includes("alacritty")||!!t?.startsWith("foot")||!!r.KITTY_WINDOW_ID||!!r.ALACRITTY_LOG||!!r.KONSOLE_VERSION||!!r.WT_SESSION||!!r.ZED_TERM||parseInt(r.VTE_VERSION??"",10)>=4400}var R;var o=i(()=>{T();n();R=new Set(["iTerm.app","vscode","WezTerm","WarpTerminal","Hyper","Tabby","rio","contour","alacritty"])});
export{a as Iw,o as Jw};
