import os
import io
import logging
import requests
from flask import Flask, Blueprint, render_template, request, jsonify
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv
import base64

load_dotenv()

yarn_calculator = Blueprint("yarn_calculator", __name__)

# Roboflow API
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL = "crochet-stitch-detector"
ROBOFLOW_VERSION = "9"

if not ROBOFLOW_API_KEY:
    raise RuntimeError("ROBOFLOW_API_KEY not set in environment")

# Estimated yarn usage for medium-thickness yarn [cm] (per 1 stitch)
YARN_USAGE = {
    "sc": 1.2,    # single crochet
    "dc": 2.0,    # double crochet
    "hdc": 1.5,   # half double crochet
    "tr": 3.0,    # treble crochet
    "ch": 0.8,    # chain
    "slst": 0.5,  # slip stitch
    "mr": 1.5     # magic ring
}

DEFAULT_YARN_CM = 1.5   # unknown stitch
ERROR_MARGIN = 0.10

# Yarn usage multipliers depending on yarn thickness (per 1 stitch)
THICKNESS_MULTIPLIERS = {
    "Thin": 0.8,
    "Medium": 1.0,
    "Thick": 1.3
}

COLORS = ["red", "blue", "green", "orange", "purple", "teal", "brown"]

@yarn_calculator.route("/", methods=["GET", "POST"])
def calculate_yarn():
    if request.method == "POST":
            return handle_ajax_request()
    return render_template("yarn_calculator.html")

def handle_ajax_request():
    try:
        thickness = request.form.get("thickness", "Medium")
        multiplier = THICKNESS_MULTIPLIERS.get(thickness, 1.0)

        uploaded_file = request.files.get("image")

        if not uploaded_file or not uploaded_file.filename:
            return jsonify({"error": "No image uploaded"}), 400
            
        if not uploaded_file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return jsonify({"error": "Only PNG and JPG images are allowed"}), 400

        try:
            image = Image.open(uploaded_file).convert("RGB")
        except Exception as img_error:
            logging.error(f"Image processing error: {img_error}")
            return jsonify({"error": "Invalid or corrupted image file"}), 400
        
        buffered = io.BytesIO()
        image.save(buffered, quality=90, format="JPEG")
        img_bytes = buffered.getvalue()
        buffered.close()

        # Authorization header not used here because this Roboflow detection endpoint requires the api_key in the URL
        response = requests.post(
            url=f"https://detect.roboflow.com/{ROBOFLOW_MODEL}/{ROBOFLOW_VERSION}?api_key={ROBOFLOW_API_KEY}",
            files={"file": ("image.jpg", img_bytes, "image/jpeg")},
            timeout=15
        )

        if response.status_code != 200:
            response.raise_for_status()

        data = response.json()
        predictions = data.get("predictions", [])

        if not predictions:
            return jsonify({"error": "No stitches detected in the image. Please upload a clear image of your crochet work."}), 400
        
        stitch_counts = {}
        base_yarn_cm = 0
        img_with_boxes = image.copy()
        draw = ImageDraw.Draw(img_with_boxes)

        try:
            font = ImageFont.truetype("arial.ttf", 12)
        except IOError:
            font = ImageFont.load_default()

        class_colors = {}
        color_index = 0
        
        for pred in predictions:
            cls = pred["class"]
            
            if cls not in class_colors:
                class_colors[cls] = COLORS[color_index % len(COLORS)]
                color_index += 1

            stitch_counts[cls] = stitch_counts.get(cls, 0) + 1
            usage = YARN_USAGE.get(cls, DEFAULT_YARN_CM)
            base_yarn_cm += usage

            center_x = pred["x"]
            center_y = pred["y"]
            width = pred["width"]
            height = pred["height"]
            left, top, right, bottom = center_x - width / 2, center_y - height / 2, center_x + width / 2, center_y + height / 2
            color = class_colors[cls]

            draw.rectangle([(left, top), (right, bottom)], outline=color, width=2)
            label = f"{cls}"
            draw.text((left, top - 14), label, fill=color, font=font)

        total_yarn_cm = base_yarn_cm * multiplier
        min_yarn = total_yarn_cm * (1 - ERROR_MARGIN)
        max_yarn = total_yarn_cm * (1 + ERROR_MARGIN)

        output = io.BytesIO()
        img_with_boxes.save(output, format="PNG")
        processed_img = base64.b64encode(output.getvalue()).decode()
        output.close()
        
        return jsonify({
            "original": base64.b64encode(img_bytes).decode(),
            "processed": processed_img,
            "thickness": thickness,
            "stitch_counts": stitch_counts,
            "base_yarn_estimate": round(base_yarn_cm, 1),
            "yarn_estimate": round(total_yarn_cm, 1),
            "yarn_range": [round(min_yarn, 1), round(max_yarn, 1)]
        })

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"API Error: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# WSGI
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB
app.register_blueprint(yarn_calculator, url_prefix="/")