# 🛡️ Insurance Claim Risk Classification Using XGBoost and Knowledge Distillation

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-red.svg)](https://pytorch.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7%2B-orange.svg)](https://xgboost.readthedocs.io/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28%2B-brightgreen.svg)](https://streamlit.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Research Reference:**  
> *Insurance Claim Risk Classification Using XGBoost and Knowledge Distillation*  
> **Author:** Jatoth Akhil  
> **Affiliation:** Department of Information Technology, Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad, India  

---

## 📌 1. Project Overview

Insurance claim fraud detection is a mission-critical yet heavily imbalanced classification challenge in the financial and insurance sectors. This repository implements an end-to-end Machine Learning pipeline trained on a **100,000-record insurance dataset** containing **35 attributes**.

To achieve both high predictive capacity and lightweight inference for production deployment:
1. **Teacher Model (Gradient Boosting):** A class-weighted **XGBoost** classifier handles complex tabular patterns and severe class imbalance (`scale_pos_weight = 19.0954`).
2. **Student Model (Deep Learning):** A compact 4-layer fully connected **PyTorch** neural network is trained via **Knowledge Distillation** to learn both ground-truth hard labels and soft probability representations from the teacher.
3. **Automated Claim Routing Engine:** A multi-tier risk decision rule that routes incoming claims to **Fast-Track Payout**, **Standard Review**, or **Fraud Investigation**.
4. **Interactive Web Dashboard:** A **Streamlit** dashboard for real-time claim entry, batch simulation, and risk routing.

---

## 🏗️ 2. Architecture & Distillation Workflow

```
 ┌──────────────────────┐
 │ Insurance Claim Data │ (100,000 Records, 35 Attributes)
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ Cleaning & Imputation│ (authorities_contacted -> 'Unknown', claim_id dropped)
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ 93-Feature Pipeline  │ (Median Impute + StandardScaler, Most Freq Impute + OneHotEncoder)
 └─────┬──────────┬─────┘
       │          │
       ▼          ▼
 ┌──────────┐   ┌────────────────────────────────────────────────────┐
 │ XGBoost  │   │ PyTorch Compact Student Net (93 -> 128-> 64-> 32-> 1)│
 │ Teacher  │──▶│ Loss: L = α * L_hard + (1 - α) * T² * L_soft        │
 └──────────┘   └─────────────────────────┬──────────────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ Claim Routing Engine │
                               │  ≤ 0.30 ➜ Fast Payout│
                               │  .30-.70➜ Std Review │
                               │  > 0.70 ➜ SIU Audit  │
                               └──────────────────────┘
```

---

## 📊 3. Experimental Results (Benchmark)

Evaluated on the **20,000-record test set** (80:20 stratified split):

| Metric | Teacher Model (XGBoost) | Student Model (PyTorch Distilled) |
| :--- | :---: | :---: |
| **Accuracy** | **83.98%** | **95.03%** |
| **Precision** | **5.30%** | 0.00% |
| **Recall** | **13.17%** | 0.00% |
| **F1-Score** | **7.56%** | 0.00% |
| **ROC-AUC** | **0.5018** | **0.4963** |

### 🔬 Key Findings:
- **Class Imbalance Dynamics:** Genuine claims (`Class 0`) comprise 95.02% (76,019 train samples), while positive fraud records (`Class 1`) comprise only 4.98% (3,981 train samples).
- **Teacher Recall:** By leveraging `scale_pos_weight = 19.0954`, XGBoost achieves 13.17% recall on minority fraud patterns.
- **Distillation Loss:** Student training loss reduced smoothly from **5.7274** (Epoch 1) to **5.7116** (Epoch 15) using temperature $T = 4.0$ and $\alpha = 0.5$.

---

## 🚦 4. Probability-Based Claim Routing Rules

Incoming claims are evaluated in real time by calculating fraud risk probability $P(\text{Fraud})$:

| Risk Level | Probability Threshold | Action Routing | Operational Workflow |
| :--- | :---: | :--- | :--- |
| 🟢 **Low Risk** | $P \le 0.30$ | **Fast-Track Payout** | Instant straight-through payout without manual hold. |
| 🟡 **Medium Risk** | $0.30 < P \le 0.70$ | **Standard Review** | Routed to insurance adjusters for documentation verification. |
| 🔴 **High Risk** | $P > 0.70$ | **Fraud Investigation** | Escrow held; transferred to Special Investigation Unit (SIU). |

---

## 🚀 5. Getting Started & Installation

### Prerequisites
- Python 3.9+ 
- Recommended: Virtual Environment (`venv` or `conda`)

### Step 1: Clone Repository & Install Dependencies
```bash
git clone <repo-url>
cd ML-PROJECT
pip install -r requirements.txt
```

### Step 2: Train Model & Export Artifacts
Train the full teacher-student distillation pipeline:
```bash
python save_model.py
```
*Outputs generated:* `preprocessor.pkl`, `claim_template.pkl`, `student_model.pt`.

---

## 💻 6. Running the Applications

### Option A: Interactive Streamlit Web UI (Recommended)
Launch the modern web dashboard:
```bash
streamlit run app.py
```
Access at `http://localhost:8501`.

### Option B: Command-Line Assessment (Interactive)
To evaluate claims directly from the terminal:
```bash
python manual_input.py
```

### Option C: Instant Test Execution
Test automated batch / single claim inference:
```bash
python test_user_input.py
python test_random_claim.py
```

### Option D: Jupyter Notebook
Run the end-to-end research notebook:
```bash
jupyter notebook ML_Project.ipynb
```

---

## 📁 7. Project Structure

```
ML-PROJECT/
├── Insurance_Fraud_Dataset_100K_Realistic.xlsx # 100K Insurance Dataset
├── ML_Project.ipynb                           # Complete Research Notebook
├── app.py                                     # Streamlit Web App Interface
├── run_pipeline.py                            # End-to-end Training & Eval Pipeline
├── save_model.py                              # Artifact Trainer & Exporter
├── predict_claim.py                           # CLI & Reusable Prediction Module
├── manual_input.py                            # Interactive Terminal Claim Entry
├── test_user_input.py                         # Single Claim Test Script
├── test_random_claim.py                       # Random Claim Simulator
├── requirements.txt                           # Project Dependencies
├── preprocessor.pkl                           # Fitted Scikit-Learn Preprocessor (93 feats)
├── claim_template.pkl                         # Baseline DataFrame Schema Template
├── student_model.pt                           # Trained Distilled PyTorch Model
└── README.md                                  # Documentation
```

---

## 📜 8. References & Citation

1. **A. Author et al.**, *"Automobile insurance fraud detection using data mining: A systematic literature review,"* Internet of Things and Cyber-Physical Systems, 2024.
2. **T. Chen & C. Guestrin**, *"XGBoost: A Scalable Tree Boosting System,"* ACM SIGKDD, 2016.
3. **N. V. Chawla et al.**, *"SMOTE: Synthetic Minority Over-sampling Technique,"* JAIR, 2002.
4. **G. Hinton, O. Vinyals, & J. Dean**, *"Distilling the Knowledge in a Neural Network,"* NIPS Workshop, 2015.
5. **F. Pedregosa et al.**, *"Scikit-learn: Machine Learning in Python,"* JMLR, 2011.

---
*Developed at Department of Information Technology, Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad.*
