# Yarn Usage Estimator
Computer vision with YOLOv11 for detecting crochet stitches and estimating yarn usage.
<img width="1178" height="385" alt="Model preview" src="https://github.com/user-attachments/assets/a076f343-dc18-4a7c-85ac-186d5c65daa5" />

## yolov11-crochet-stitch-seg-colab.ipynb

This notebook demonstrates the **segmentation of crochet stitches** on graphic patterns using **YOLOv11**.  
It provides a **complete end-to-end workflow** from dataset preparation to model training and evaluation.

## Key Metrics
- **Box** mAP50 0.911 | mAP50-95 0.708
- **Mask** mAP50 0.903 | mAP50-95 0.614

## Workflow

1. **Data annotation** – Images labeled into 7 stitch categories using **Roboflow**.  
2. **Data loading** – Dataset retrieved directly via the **Roboflow API**.  
3. **Model training** – YOLOv11 trained on the annotated dataset.  
4. **Validation and testing** – Model performance evaluated on validation and test sets.

## TODO
- [ ] Implement yarn usage estimation
- [ ] Explore hyperparameter tuning to further optimize model performance
- [ ] Add local version of the notebook
- [ ] Add demo site for interactive showcase
