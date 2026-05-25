import io
import csv
from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from realtime_attentive import generate_frames, get_current_attention_score

# APP INIT
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # CORS fix - all routes allowed

client = MongoClient("mongodb://localhost:27017/")
db = client["classroom_attentiveness"]
users_col = db["users"]
logs_col = db["attentiveness_logs"]
print("Connected to MongoDB")

# LOGIN
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = users_col.find_one({
        "username": data.get("username"),
        "password": data.get("password")
    })
    if user:
        return jsonify({"success": True, "role": user["role"]})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401


# VIDEO STREAM
@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")


# ATTENTION LOGS
@app.route("/attention_logs", methods=["GET"])
def attention_logs():
    logs = logs_col.find().sort("timestamp", -1).limit(60)
    data = []
    for log in logs:
        data.append({
            "timestamp": log["timestamp"],
            "status": log["status"]
        })
    return jsonify(data[::-1])


# EXPORT REPORT — PDF & CSV

DUMMY_STUDENTS = [
    {"sr": 2, "name": "Saksham Sharma", "roll": "T044"},
    {"sr": 3, "name": "Raj Halwai",  "roll": "T019"},
    {"sr": 4, "name": "Manan Jain",   "roll": "T020"},
    {"sr": 5, "name": "Harshit Jaiswal",  "roll": "T021"},
]

@app.route("/export_report", methods=["GET", "OPTIONS"])  # OPTIONS added for CORS preflight
def export_report():

    # Handle CORS preflight
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    fmt        = request.args.get("format", "pdf")
    class_name = request.args.get("class_name", "TYIT")
    teacher    = request.args.get("teacher", "Sumit Sir")
    subject    = request.args.get("subject", "Subject")
    duration   = request.args.get("duration", "1 Hour")
    generated  = datetime.now().strftime("%d %b %Y, %I:%M %p")

    real_score = get_current_attention_score()

    # Build rows
    rows = [{"sr": 1, "name": "Ankit Bind", "roll": "T006", "score": f"{real_score}%"}]
    for s in DUMMY_STUDENTS:
        rows.append({**s, "score": "null"})


    # CSV EXPORT
    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Classroom Attentiveness Report"])
        writer.writerow(["Class", class_name])
        writer.writerow(["Teacher", teacher])
        writer.writerow(["Subject", subject])
        writer.writerow(["Duration", duration])
        writer.writerow(["Generated", generated])
        writer.writerow([])
        writer.writerow(["Sr No", "Student Name", "Roll No", "Attention Score"])
        for r in rows:
            writer.writerow([r["sr"], r["name"], r["roll"], r["score"]])

        output.seek(0)
        bytes_output = io.BytesIO(output.getvalue().encode("utf-8"))

        response = send_file(
            bytes_output,
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"attention_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    # PDF EXPORT

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=40, rightMargin=40,
        topMargin=40, bottomMargin=40
    )
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("Classroom Attentiveness Report", styles["Title"]))
    elements.append(Spacer(1, 12))

    # Info block
    info_data = [
        ["Class",     class_name, "Teacher",  teacher],
        ["Subject",   subject,    "Duration", duration],
        ["Generated", generated,  "",         ""],
    ]
    info_table = Table(info_data, colWidths=[80, 140, 80, 150])
    info_table.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME",      (0, 0), (0, -1),  "Helvetica-Bold"),
        ("FONTNAME",      (2, 0), (2, -1),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Report table
    header = ["Sr No", "Student Name", "Roll No", "Attention Score"]
    table_data = [header] + [
        [r["sr"], r["name"], r["roll"], r["score"]] for r in rows
    ]

    report_table = Table(table_data, colWidths=[50, 200, 100, 130])
    report_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  11),
        ("ALIGN",         (0, 0), (-1, 0),  "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  10),
        ("TOPPADDING",    (0, 0), (-1, 0),  10),
        ("BACKGROUND",    (0, 1), (-1, 1),  colors.HexColor("#e8f4e8")),
        ("FONTNAME",      (0, 1), (-1, 1),  "Helvetica-Bold"),
        ("ROWBACKGROUNDS",(0, 2), (-1, -1), [colors.white, colors.HexColor("#f4f4f4")]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE",      (0, 1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("TOPPADDING",    (0, 1), (-1, -1), 8),
    ]))
    elements.append(report_table)

    doc.build(elements)
    buffer.seek(0)

    response = send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"attention_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


# RUN

if __name__ == "__main__":
    app.run(debug=True, threaded=True, host="0.0.0.0", port=5000)
