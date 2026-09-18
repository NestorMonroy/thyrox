#!/usr/bin/env python3
"""Reproduce desde primeros principios los vectores del brief de z-loss.

NO se convierte una cifra del brief en asercion sin reproducirla: el brief es
una afirmacion, no una ``Observation``. Dos de sus cifras NO reproducen tal
como estan escritas, y esta sonda mide cual es el parametro real.
"""
import math

ALPHA = 1e-4


def log_sum_exp(logits):
    """log Z(x) = log sum_j e^{logit_j}, con el maximo restado."""
    top = max(logits)
    return top + math.log(sum(math.exp(v - top) for v in logits))


def softmax(logits):
    z = log_sum_exp(logits)
    return [math.exp(v - z) for v in logits]


NORMAL = [1.0, 2.0, 0.5, 3.0]
LARGE = [10.0, 25.0, 5.0, 30.0]

print("== 1. log Z y probabilidades ==")
for name, logits in (("normales", NORMAL), ("grandes", LARGE)):
    z = log_sum_exp(logits)
    p = softmax(logits)
    print(f"  {name:9s} log Z = {z:.4f}  probs = {[round(x, 6) for x in p]}")

print()
print("== 2. z-loss = alpha * (log Z)^2 ==")
for name, logits in (("normal", NORMAL), ("grande", LARGE)):
    z = log_sum_exp(logits)
    print(f"  z_loss_{name:7s} = {ALPHA * z * z:.6f}   (brief: "
          f"{'0.001198' if name == 'normal' else '0.09004'})")

print()
print("== 3. LAS DOS QUE NO REPRODUCEN ==")
print("  3a. «colapsaron a 0.0» — los valores REALES en float64:")
p = softmax(LARGE)
for logit, prob in zip(LARGE, p):
    print(f"      logit {logit:5.1f} -> P = {prob:.6e}   ¿es 0.0 exacto? {prob == 0.0}")
print(f"      el piso de float64 es 2.225e-308, cuyo log natural es "
      f"{math.log(2.225e-308):.6f}")
print("      -> el `0.` del brief es precision de IMPRESION de numpy, no underflow.")

print()
print("  3b. el descenso: que par (alpha, lr) reproduce la traza del brief")
TRACE = [30.0067, 29.7110, 29.4196, 29.1329, 28.8513, 28.5755]
MAX_TRACE = (29.7019, 28.2698)   # max(logits) primero y ultimo del brief


def descend(alpha, lr, steps=5):
    """grad = 2 * alpha * logZ * probs; logits -= lr * grad."""
    logits = list(LARGE)
    zs = [log_sum_exp(logits)]
    for _ in range(steps):
        z = log_sum_exp(logits)
        p = softmax(logits)
        logits = [v - lr * (2 * alpha * z * q) for v, q in zip(logits, p)]
        zs.append(log_sum_exp(logits))
    return zs, max(logits)


for alpha, lr, etiqueta in ((1e-4, 0.5, 'brief tal cual'),
                            (1e-4, 50.0, 'lr x100'),
                            (1e-2, 0.5, 'alpha x100')):
    zs, top = descend(alpha, lr)
    ok = all(abs(a - b) < 5e-3 for a, b in zip(zs, TRACE))
    print(f"      alpha={alpha:<7g} lr={lr:<6g} ({etiqueta:14s}) "
          f"log Z: {' '.join(f'{v:.4f}' for v in zs[:3])} ... "
          f"max={top:.4f}  ¿reproduce? {ok}")
print(f"      traza del brief:                      "
      f"{' '.join(f'{v:.4f}' for v in TRACE[:3])} ... max={MAX_TRACE[1]}")
