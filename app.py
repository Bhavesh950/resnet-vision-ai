from flask import Flask, render_template, request
import os
import numpy as np
from tensorflow.keras.applications.resnet50 import ( ResNet50,preprocess_input,decode_predictions)
from tensorflow.keras.preprocessing import image

app = Flask(__name__)

UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Load pretrained ResNet50
model = ResNet50(weights="imagenet")

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    
    if "image" not in request.files:
        return "no imagw"
        
    file = request.files["image"]
    
    if file .filename == "":
        return "no file selected"

    filepath = os.path.join(
        app.config["UPLOAD_FOLDER"],
        file.filename
    )

    file.save(filepath)

    # Image Load
    img = image.load_img(
        filepath,
        target_size=(224, 224)
    )

    img_array = image.img_to_array(img)

    img_array = np.expand_dims(
        img_array,
        axis=0
    )

    img_array = preprocess_input(img_array)

    predictions = model.predict(img_array)

    decoded = decode_predictions(predictions,top=5)[0]
    class_name = decoded[0][1]
    confidence = float(decoded[0][2] * 100)
    top_predictions = []
    
    for item in decoded:
        top_predictions.append({
            "name": item[1],
            "score": round(item[2] * 100, 2)
            })

    return render_template(
        "index.html", 
        uploaded_image=filepath, 
        prediction=class_name,
        confidence=confidence,
        top_predictions=top_predictions
        )


if __name__ == "__main__":
    app.run(debug=True)