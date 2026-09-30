// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ea}from"/$bunfs/root/chunk-hf9yhhhe.js";var Mg={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function gD(E){return ea(`?${E}h`)}function d6(E){return ea(`?${E}l`)}var jet=gD(Mg.SYNCHRONIZED_UPDATE),ZIe=d6(Mg.SYNCHRONIZED_UPDATE),Qmr=gD(Mg.BRACKETED_PASTE),tCt=d6(Mg.BRACKETED_PASTE),nCt=gD(Mg.FOCUS_EVENTS),H2e=d6(Mg.FOCUS_EVENTS),Zmr=gD(Mg.THEME_NOTIFY),rCt=d6(Mg.THEME_NOTIFY),CT=gD(Mg.CURSOR_VISIBLE),RT=d6(Mg.CURSOR_VISIBLE),O2e=gD(Mg.ALT_SCREEN_CLEAR),M2e=d6(Mg.ALT_SCREEN_CLEAR),oCt=d6(Mg.WIN32_INPUT_MODE),_=gD(Mg.MOUSE_NORMAL)+gD(Mg.MOUSE_BUTTON)+gD(Mg.MOUSE_ANY)+gD(Mg.MOUSE_SGR),t=gD(Mg.MOUSE_NORMAL)+gD(Mg.MOUSE_SGR),eJ=d6(Mg.MOUSE_SGR)+d6(Mg.MOUSE_ANY)+d6(Mg.MOUSE_BUTTON)+d6(Mg.MOUSE_NORMAL);function zet(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{Mg,gD,d6,jet,ZIe,Qmr,tCt,nCt,H2e,Zmr,rCt,CT,RT,O2e,M2e,oCt,eJ,zet};
