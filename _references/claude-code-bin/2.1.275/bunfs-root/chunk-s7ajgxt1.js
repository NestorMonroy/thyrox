// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ki}from"/$bunfs/root/chunk-qwxqekf7.js";var Gg={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function MD(E){return Ki(`?${E}h`)}function Q6(E){return Ki(`?${E}l`)}var $nt=MD(Gg.SYNCHRONIZED_UPDATE),PHe=Q6(Gg.SYNCHRONIZED_UPDATE),Ybr=MD(Gg.BRACKETED_PASTE),Mxt=Q6(Gg.BRACKETED_PASTE),Dxt=MD(Gg.FOCUS_EVENTS),TWe=Q6(Gg.FOCUS_EVENTS),Xbr=MD(Gg.THEME_NOTIFY),Lxt=Q6(Gg.THEME_NOTIFY),eC=MD(Gg.CURSOR_VISIBLE),tC=Q6(Gg.CURSOR_VISIBLE),CWe=MD(Gg.ALT_SCREEN_CLEAR),RWe=Q6(Gg.ALT_SCREEN_CLEAR),Nxt=Q6(Gg.WIN32_INPUT_MODE),_=MD(Gg.MOUSE_NORMAL)+MD(Gg.MOUSE_BUTTON)+MD(Gg.MOUSE_ANY)+MD(Gg.MOUSE_SGR),t=MD(Gg.MOUSE_NORMAL)+MD(Gg.MOUSE_SGR),LJ=Q6(Gg.MOUSE_SGR)+Q6(Gg.MOUSE_ANY)+Q6(Gg.MOUSE_BUTTON)+Q6(Gg.MOUSE_NORMAL);function Fnt(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{Gg,MD,Q6,$nt,PHe,Ybr,Mxt,Dxt,TWe,Xbr,Lxt,eC,tC,CWe,RWe,Nxt,LJ,Fnt};
