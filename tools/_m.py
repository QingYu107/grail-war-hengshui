import re,io,sys
p="tools/_e2new.txt"
s=io.open(p,encoding="utf-8").read()
n=0
chs=re.split(r"\n      \{\n        title: ",s)
for c in chs[1:]:
    t=c.split("\n")[0]
    cnt=sum(len(x.replace(" ","")) for x in re.findall(r"'((?:[^'\\\\]|\\\\.)*)'",c))
    print(t, cnt, len(re.findall(r"\{ fx: ",c)))
allt=re.findall(r"'((?:[^'\\\\]|\\\\.)*)'",s)
body="".join(allt)
print("TOTAL_prose_chars", sum(len(x) for x in allt))
for w in ["仿佛","宛如","似乎"]:
    print(w, body.count(w))
print("latin", re.findall(r"[A-Za-z]+", "".join(re.findall(r"\'([^\']*)\'",s))))
print("ni_count", body.count("你"))
