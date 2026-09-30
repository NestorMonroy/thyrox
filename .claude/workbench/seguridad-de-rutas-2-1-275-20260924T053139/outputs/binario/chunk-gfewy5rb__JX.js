function JX(t){let e=/^(?:\\\\[?.]\\|\\\?\?\\)(?=[A-Za-z]:[\\/])/.exec(t);if(!e)return t;let r=t.slice(e[0].length),n=r.slice(2);return e[0].includes("\\")&&n.includes("/")||Wt(n)?t:r}
