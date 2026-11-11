import re,io
def count(p):
    s=io.open(p,encoding="utf-8").read()
    parts=re.split(r"        title: '第",s)
    tot=0
    for i,c in enumerate(parts[1:],1):
        n=0;fx=0
        for line in c.split("\n"):
            m=re.match(r"^\s{10}'(.+)',?\s*$",line)
            if m: n+=len(m.group(1).replace(" ",""))
            if re.search(r"\{ fx: ",line): fx+=1
        tot+=n
        print("  ch%d %d chars %d fx"%(i,n,fx))
    print(p,"TOTAL",tot)
    body="".join(re.findall(r"^\s{10}'(.+)',?\s*$",s,re.M))
    for w in ["仿佛","宛如","似乎"]:
        if w in body: print("  BANNED",w,body.count(w))
    latin=re.findall(r"^\s{10}'[^']*?([A-Za-z][A-Za-z]+)",s,re.M)
    print("  latin in prose lines:",set(latin))
    print("  ni:",body.count("你"))
for p in ["tools/_e2new.txt","tools/_e3new.txt"]:
    print("==",p); count(p)
