# -*- coding: utf-8 -*-
import io,re
def blocks(path,key):
    s=io.open(path,encoding="utf-8").read()
    a=s.index("  T.%s = {"%key); b=s.index("  /* ============================================================",a)
    return s[a:b]
pairs=[("js/data/timeline_e2e9.js","E2","js/data/timeline_e2e9.js.bak"),
       ("js/data/timeline_e3e8.js","E3","js/data/timeline_e3e8.js.bak")]
for path,key,bak in pairs:
    new=blocks(path,key); old=blocks(bak,key)
    # fx objects comparison
    fx_new=re.findall(r"\{ fx: [\s\S]*?\},?\n",new)
    fx_old=re.findall(r"\{ fx: [\s\S]*?\},?\n",old)
    print("==",key,"fx new/old",len(fx_new),len(fx_old))
    norm=lambda x: re.sub(r"\s+"," ",x).strip()
    same=all(norm(a)==norm(b) for a,b in zip(fx_new,fx_old))
    print("   fx identical:",same)
    if not same:
        for a,b in zip(fx_new,fx_old):
            if norm(a)!=norm(b): print("   DIFF:",norm(a)[:80],"||",norm(b)[:80])
    # prose strings only (10-space indented standalone strings, plus doc)
    prose=re.findall(r"^\s{10}'(.+)',?\s*$",new,re.M)
    body="".join(prose)
    for w in ["仿佛","宛如","似乎"]:
        if w in new: print("   BANNED in block:",w,new.count(w))
    lat=[x for x in re.findall(r"[A-Za-z]+",body)]
    print("   english in prose:",lat)
    # narration-only check: lines without 「」
    narr=[x for x in prose if "「" not in x]
    nl=[x for x in narr if "你" in x]
    print("   narration lines with 你:",len(nl))
    for x in nl[:5]: print("     >",x[:50])
    print("   prose chars:",sum(len(x.replace(" ","")) for x in prose))
