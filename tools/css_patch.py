# -*- coding: utf-8 -*-
import io, re
p = r'E:\dsh-workspace\grail-war\assets\css\archive.css'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""  background:
    radial-gradient(120% 90% at 10% 0%, rgba(255,252,240,0.55), transparent 60%),
    radial-gradient(90% 70% at 100% 100%, rgba(120,96,58,0.16), transparent 60%),
    linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 62%, var(--paper-3) 100%);
  box-shadow: var(--shadow), inset 0 0 120px rgba(110, 88, 52, 0.22);""",
"""  background:
    radial-gradient(120% 90% at 8% 0%, rgba(255,253,244,0.72), transparent 58%),
    radial-gradient(90% 70% at 100% 100%, rgba(150,120,72,0.10), transparent 62%),
    linear-gradient(180deg, #f4ecda 0%, #ece1c9 58%, #e2d5b8 100%);
  box-shadow: var(--shadow), inset 0 0 90px rgba(120, 96, 58, 0.12);""")
s = s.replace("""  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.20'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
  opacity: .55; pointer-events: none;""",
"""  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.14'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
  opacity: .5; pointer-events: none;""")
s = s.replace("background: repeating-linear-gradient(0deg, rgba(60,45,25,0.055) 0 1px, transparent 1px 3px);",
              "background: repeating-linear-gradient(0deg, rgba(70,52,30,0.038) 0 1px, transparent 1px 3px);")
io.open(p,'w',encoding='utf-8').write(s)
print('css patched')
