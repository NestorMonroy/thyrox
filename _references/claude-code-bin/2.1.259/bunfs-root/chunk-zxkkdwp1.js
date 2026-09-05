// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{pp}from"/$bunfs/root/chunk-nt36bgfs.js";var Xp={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function vD(E){return pp(`?${E}h`)}function uz(E){return pp(`?${E}l`)}var tVe=vD(Xp.SYNCHRONIZED_UPDATE),ube=uz(Xp.SYNCHRONIZED_UPDATE),P0t=vD(Xp.BRACKETED_PASTE),nVe=uz(Xp.BRACKETED_PASTE),jat=vD(Xp.FOCUS_EVENTS),OLe=uz(Xp.FOCUS_EVENTS),D0t=vD(Xp.THEME_NOTIFY),rVe=uz(Xp.THEME_NOTIFY),Wk=vD(Xp.CURSOR_VISIBLE),mC=uz(Xp.CURSOR_VISIBLE),Gat=vD(Xp.ALT_SCREEN_CLEAR),ijn=uz(Xp.ALT_SCREEN_CLEAR),Wat=uz(Xp.WIN32_INPUT_MODE),_=vD(Xp.MOUSE_NORMAL)+vD(Xp.MOUSE_BUTTON)+vD(Xp.MOUSE_ANY)+vD(Xp.MOUSE_SGR),t=vD(Xp.MOUSE_NORMAL)+vD(Xp.MOUSE_SGR),hF=uz(Xp.MOUSE_SGR)+uz(Xp.MOUSE_ANY)+uz(Xp.MOUSE_BUTTON)+uz(Xp.MOUSE_NORMAL);function wY(E){switch(E){case"full":return _;case"scroll":return t;case"off":return""}}
export{Xp,vD,uz,tVe,ube,P0t,nVe,jat,OLe,D0t,rVe,Wk,mC,Gat,ijn,Wat,hF,wY};
