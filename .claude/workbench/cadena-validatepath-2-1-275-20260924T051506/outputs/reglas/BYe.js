function BYe(e){let n=Bn(e,"read","deny"),r=new Map;for(let[s,{patternMap:g}]of n.entries())r.set(s,Array.from(g.keys()).filter((h)=>!h.startsWith("!")));return r}
