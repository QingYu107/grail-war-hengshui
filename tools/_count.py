import re,io
for f,key in [("js/data/timeline_e2e9.js","E2"),("js/data/timeline_e3e8.js","E3")]:
    s=io.open(f,encoding="utf-8").read()
    start=s.index("  T.%s = {"%key)
    end=s.index("  /* ============================================================",start)
    blk=s[start:end]
    chs=re.split(r"\n      \{\n        title: ",blk)
    for c in chs[1:]:
        t=c.split("\n")[0]
        n=0;fx=0
        for it in re.findall(r"'((?:[^'\\]|\\.)*)'",c):
            n+=len(it.replace(" ",""))
        fx=len(re.findall(r"\{ fx: ",c))
        print(key,t,len(c),"chars_raw",fx,"fx")
