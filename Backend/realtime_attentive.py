import cv2
import numpy as np
import joblib
import threading
import pytz
import queue

from collections import deque
from datetime import datetime
from pymongo import MongoClient

from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input


# MediaPipe Imports 
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.python.solutions.face_mesh import FaceMesh  # ✅ Direct import fix


# MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["classroom_attentiveness"]
logs_col = db["attentiveness_logs"]
ist = pytz.timezone("Asia/Kolkata")

def log_async(label):
    logs_col.insert_one({
        "timestamp": datetime.now(ist).strftime("%Y-%m-%dT%H:%M:%S"),
        "status": label
    })


# Load ML Model
model = joblib.load("models/hybrid_attention_model.pkl")

mobilenet = MobileNetV2(
    include_top=False,
    weights="imagenet",
    pooling="avg",
    input_shape=(160, 160, 3)
)

def get_embedding(face_img):
    face_img = cv2.resize(face_img, (160, 160))
    face_img = preprocess_input(face_img)
    face_img = np.expand_dims(face_img, axis=0)
    return mobilenet.predict(face_img, verbose=0)[0]

# MediaPipe Face Detector (BlazeFace)
base_options = python.BaseOptions(
    model_asset_path="models/blaze_face_short_range.tflite"
)
options = vision.FaceDetectorOptions(
    base_options=base_options,
    min_detection_confidence=0.5
)
detector = vision.FaceDetector.create_from_options(options)


# FEATURE 4: Eye Detection via FaceMesh 
face_mesh = FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Eye landmark indices 
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]
EAR_THRESHOLD = 0.22  # below this = eyes closed

def calculate_ear(landmarks, eye_indices, frame_w, frame_h):
    """Eye Aspect Ratio — lower means more closed"""
    pts = [(landmarks[i].x * frame_w, landmarks[i].y * frame_h) for i in eye_indices]
    A = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    B = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
    C = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
    return (A + B) / (2.0 * C) if C != 0 else 0

def detect_eyes_open(frame):
    """Returns True=open, False=closed, None=no face found"""
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)
    if not result.multi_face_landmarks:
        return None
    h, w = frame.shape[:2]
    lms = result.multi_face_landmarks[0].landmark
    avg_ear = (
        calculate_ear(lms, LEFT_EYE, w, h) +
        calculate_ear(lms, RIGHT_EYE, w, h)
    ) / 2.0
    return avg_ear >= EAR_THRESHOLD


# Smoothing
smooth_buffer = deque(maxlen=10)
bbox_prev = None

def smooth_pred(pred):
    smooth_buffer.append(pred)
    return 1 if sum(smooth_buffer) > len(smooth_buffer) / 2 else 0

def smooth_bbox(prev, new, alpha=0.7):
    if prev is None:
        return new
    px1, py1, px2, py2 = prev
    nx1, ny1, nx2, ny2 = new
    return (
        int(px1 * alpha + nx1 * (1 - alpha)),
        int(py1 * alpha + ny1 * (1 - alpha)),
        int(px2 * alpha + nx2 * (1 - alpha)),
        int(py2 * alpha + ny2 * (1 - alpha)),
    )

# Global Tracking
tracker = None
tracking = False
current_prediction = None
last_label = None
last_face = None
inference_running = False

# Attention history for focus score 
attention_history = deque(maxlen=100)

def get_current_attention_score():
    """Returns 0-100 score for export report"""
    if len(attention_history) == 0:
        return 0
    return round(sum(attention_history) / len(attention_history) * 100)

def run_inference(face_crop):
    global current_prediction, inference_running
    inference_running = True
    emb = get_embedding(face_crop)
    pred = model.predict([emb])[0]
    current_prediction = smooth_pred(pred)
    inference_running = False

# FEATURE 3: Dedicated Capture Thread 
frame_queue = queue.Queue(maxsize=2)

def capture_frames(cap):
    while True:
        success, frame = cap.read()
        if not success:
            break
        frame = cv2.flip(frame, 1)
        # Drop old frames to always serve latest
        if frame_queue.full():
            try:
                frame_queue.get_nowait()
            except queue.Empty:
                pass
        frame_queue.put(frame)


# FEATURE 2: Face Overlay Drawing
STUDENT_NAME = "Ankit Bind"  

def draw_overlay(frame, x1, y1, x2, y2, label, focus_pct):
    """Draws bounding box + bottom status bar"""
    color = (0, 220, 0) if label == "attentive" else (0, 0, 220)

    # Bounding box around face
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    # Semi-transparent black bar at bottom
    bar_h = 72
    overlay = frame.copy()
    cv2.rectangle(
        overlay,
        (0, frame.shape[0] - bar_h),
        (frame.shape[1], frame.shape[0]),
        (0, 0, 0),
        -1
    )
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

    # Status label
    cv2.putText(frame, "Status:", (10, frame.shape[0] - 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    cv2.putText(frame, label.capitalize(), (82, frame.shape[0] - 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Student name
    cv2.putText(frame, f"Student Name : {STUDENT_NAME}", (10, frame.shape[0] - 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    # Focus % text (right side)
    bar_x = frame.shape[1] - 165
    cv2.putText(frame, f"Focus: {focus_pct}%", (bar_x, frame.shape[0] - 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    # Focus progress bar
    total_w = 145
    filled_w = int(total_w * focus_pct / 100)
    by = frame.shape[0] - 28
    cv2.rectangle(frame, (bar_x, by), (bar_x + total_w, by + 12), (70, 70, 70), -1)
    cv2.rectangle(frame, (bar_x, by), (bar_x + filled_w, by + 12), (0, 220, 0), -1)

# FEATURE 3: Optimized generate_frames
def generate_frames():
    global tracker, tracking, bbox_prev
    global current_prediction, last_label, last_face

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 480)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    cv2.setUseOptimized(True)

    # Start dedicated capture thread
    threading.Thread(target=capture_frames, args=(cap,), daemon=True).start()

    frame_count = 0
    last_log_time = datetime.now()

    while True:
        try:
            frame = frame_queue.get(timeout=1)
        except queue.Empty:
            continue

        frame_count += 1

        # FEATURE 4: Eye check every frame (FaceMesh is fast)
        eyes_open = detect_eyes_open(frame)

        # Face detection every 20 frames
        if frame_count % 20 == 0 or not tracking:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
            result = detector.detect(mp_image)

            if result.detections:
                det = result.detections[0]
                b = det.bounding_box
                x1, y1 = int(b.origin_x), int(b.origin_y)
                w_box, h_box = int(b.width), int(b.height)
                tracker = cv2.TrackerCSRT_create()
                tracker.init(frame, (x1, y1, w_box, h_box))
                tracking = True

        if tracking:
            success, box = tracker.update(frame)

            if success:
                x, y, w_box, h_box = map(int, box)
                x1, y1, x2, y2 = x, y, x + w_box, y + h_box
                bbox = smooth_bbox(bbox_prev, (x1, y1, x2, y2))
                bbox_prev = bbox
                x1, y1, x2, y2 = bbox

                face_crop = frame[y1:y2, x1:x2]

                if face_crop.size != 0 and not inference_running:
                    threading.Thread(
                        target=run_inference,
                        args=(face_crop,),
                        daemon=True
                    ).start()

                if current_prediction is not None:
                    # FEATURE 4: Eye override — closed eyes = inattentive
                    if eyes_open is False:
                        final_label = "inattentive"
                    else:
                        final_label = "attentive" if current_prediction == 1 else "inattentive"

                    color = (0, 220, 0) if final_label == "attentive" else (0, 0, 220)
                    last_label = (final_label, color)
                    last_face = (x1, y1, x2, y2)

                    # Update attention history for focus score
                    attention_history.append(1 if final_label == "attentive" else 0)

                    now = datetime.now()
                    if (now - last_log_time).seconds >= 3:
                        threading.Thread(
                            target=log_async,
                            args=(final_label,),
                            daemon=True
                        ).start()
                        last_log_time = now
            else:
                tracking = False

        # FEATURE 2: Draw overlay
        if last_face and last_label:
            x1, y1, x2, y2 = last_face
            label, color = last_label
            focus_pct = get_current_attention_score()
            draw_overlay(frame, x1, y1, x2, y2, label, focus_pct)

        # Encode — 75 quality = good balance of quality vs speed
        _, buffer = cv2.imencode(
            ".jpg", frame,
            [int(cv2.IMWRITE_JPEG_QUALITY), 75]
        )

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() +
            b"\r\n"
        )

    cap.release()
