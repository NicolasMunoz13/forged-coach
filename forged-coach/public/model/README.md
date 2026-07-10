# Carpeta del modelo (TensorFlow.js)

Coloca aquí el modelo convertido por `phase-1-dl/02_export_tfjs.ipynb`:

```
public/model/
  ├── model.json
  ├── group1-shard1of1.bin   (uno o varios ficheros .bin)
  └── preprocess.json
```

La página `/evaluacion` los carga con `tf.loadLayersModel('/model/model.json')` y
lee `/model/preprocess.json`. Hasta que estén aquí, "Analizar mi cuerpo" mostrará un
mensaje pidiendo el modelo (la app compila y despliega igual).
