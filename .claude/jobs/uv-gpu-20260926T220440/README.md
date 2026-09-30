# uv-gpu

## Qué se lanzó

```
bash -c cd /home/user/thyrox && uv sync --group gpu 2>&1 | tail -15 && .venv/bin/python -c "import torch; print(\"torch\", torch.__version__, \"cuda_disponible\", torch.cuda.is_available())"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
