import os
import cv2
import numpy as np
import joblib
import tensorflow as tf

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# MobileNetV2 for embeddings
from keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input


# =======================
# CONFIG
# =======================
SCB_DIR = "dataset"
FACE_DIR = "face_data"
MODEL_SAVE_PATH = "models/hybrid_attention_model.pkl"

IMG_SIZE = (160, 160)
MAX_SCB_IMAGES = 300       # Max images per folder
MAX_FACE_IMAGES = 300      # Max per face category


# =========================================================
# 1. LOAD FACE DATASET (eyes + head direction)
# =========================================================
def load_face_data():
    X = []
    y = []

    print("\n==== LOADING FACE DATA ====")
    face_labels = {
        "eyes_open": 1,
        "eyes_closed": 0,
        "look_left": 0,
        "look_right": 0,
        "look_up": 1,
        "look_down": 0,
        "neutral": 1
    }

    for folder, label in face_labels.items():
        folder_path = os.path.join(FACE_DIR, folder)
        if not os.path.exists(folder_path):
            print(f"⚠ Skipping missing folder: {folder}")
            continue

        count = 0
        for img_name in os.listdir(folder_path):
            if count >= MAX_FACE_IMAGES:
                break

            if not img_name.lower().endswith((".jpg", ".png", ".jpeg")):
                continue

            path = os.path.join(folder_path, img_name)
            img = cv2.imread(path)

            if img is None:
                continue

            img = cv2.resize(img, IMG_SIZE)
            X.append(img)
            y.append(label)
            count += 1

        print(f"✔ {folder} loaded {count} images.")

    return np.array(X), np.array(y)


# =========================================================
# 2. LOAD SCB DATASET
# =========================================================
def load_scb_data():
    X = []
    y = []

    print("\n==== LOADING SCB DATA ====")

    attentive_folders = [
        "SCB5-Teacher",
        "SCB5-Teacher-Behavior",
        "SCB5-Handrise-Read-write",
        "SCB5-BlackBoard-Screen",
        "SCB5-BlackBoard-Screen-Teacher",
    ]

    inattentive_folders = [
        "SCB5-Talk",
        "SCB5-Talk-Teacher-Behavior",
        "SCB5-Discuss",
        "SCB5-Stand",
    ]

    # Load attentive
    for folder in attentive_folders:
        folder_path = os.path.join(SCB_DIR, folder, "images", "train")
        if not os.path.exists(folder_path):
            print("⚠ Missing:", folder)
            continue

        count = 0
        for img_name in os.listdir(folder_path):
            if count >= MAX_SCB_IMAGES:
                break

            if not img_name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            path = os.path.join(folder_path, img_name)
            img = cv2.imread(path)

            if img is None:
                continue

            img = cv2.resize(img, IMG_SIZE)
            X.append(img)
            y.append(1)       # attentive
            count += 1

        print(f"✔ {folder} loaded {count} images.")

    # Load inattentive
    for folder in inattentive_folders:
        folder_path = os.path.join(SCB_DIR, folder, "images", "train")
        if not os.path.exists(folder_path):
            print("⚠ Missing:", folder)
            continue

        count = 0
        for img_name in os.listdir(folder_path):
            if count >= MAX_SCB_IMAGES:
                break

            if not img_name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            path = os.path.join(folder_path, img_name)
            img = cv2.imread(path)

            if img is None:
                continue

            img = cv2.resize(img, IMG_SIZE)
            X.append(img)
            y.append(0)       # inattentive
            count += 1

        print(f"✔ {folder} loaded {count} images.")

    return np.array(X), np.array(y)


# =========================================================
# 3. CREATE MOBILE-NET EMBEDDER
# =========================================================
def get_mobilenet():
    return MobileNetV2(
        weights="imagenet",
        include_top=False,
        pooling="avg",
        input_shape=(160, 160, 3)
    )


# =========================================================
# 4. MAIN TRAINING PIPELINE
# =========================================================
def main():
    # Load datasets
    face_X, face_y = load_face_data()
    scb_X, scb_y = load_scb_data()

    print("\nMerging datasets...")
    X = np.concatenate([face_X, scb_X], axis=0)
    y = np.concatenate([face_y, scb_y], axis=0)

    print("Total samples:", len(X))

    # Convert to MobileNet embeddings
    print("\nExtracting embeddings using MobileNetV2...")
    embedder = get_mobilenet()

    X = preprocess_input(X)
    features = embedder.predict(X, batch_size=32, verbose=1)

    print("Embedding shape:", features.shape)

    # Train classifier
    print("\nTraining classifier...")
    X_train, X_test, y_train, y_test = train_test_split(
        features, y, test_size=0.2, random_state=42
    )

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        class_weight="balanced",
        min_samples_split=3,
        random_state=42
    )

    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    print("\n===== CLASSIFICATION REPORT =====")
    print(classification_report(y_test, y_pred))

    # Save model
    os.makedirs("models", exist_ok=True)
    joblib.dump(clf, MODEL_SAVE_PATH)

    print(f"\nModel saved as {MODEL_SAVE_PATH}")


if __name__ == "__main__":
    main()
