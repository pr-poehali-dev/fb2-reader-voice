"""
Синтез речи через Yandex SpeechKit TTS v3.
Принимает текст, возвращает аудио в base64 (WAV/OGG).
"""
import os
import json
import base64
import requests


VOICES = [
    {"id": "alena",   "name": "Алёна",   "lang": "ru"},
    {"id": "filipp",  "name": "Филипп",  "lang": "ru"},
    {"id": "ermil",   "name": "Ермил",   "lang": "ru"},
    {"id": "jane",    "name": "Джейн",   "lang": "ru"},
    {"id": "madirus", "name": "Мадирус", "lang": "ru"},
    {"id": "omazh",   "name": "Омаж",    "lang": "ru"},
    {"id": "zahar",   "name": "Захар",   "lang": "ru"},
    {"id": "dasha",   "name": "Даша",    "lang": "ru"},
    {"id": "julia",   "name": "Юлия",    "lang": "ru"},
    {"id": "lera",    "name": "Лера",    "lang": "ru"},
    {"id": "masha",   "name": "Маша",    "lang": "ru"},
    {"id": "marina",  "name": "Марина",  "lang": "ru"},
    {"id": "alexander", "name": "Александр", "lang": "ru"},
    {"id": "kirill",  "name": "Кирилл", "lang": "ru"},
    {"id": "anton",   "name": "Антон",   "lang": "ru"},
]

TTS_URL = "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize"
MAX_CHARS = 4500


def handler(event: dict, context) -> dict:
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    # Список голосов
    if event.get("httpMethod") == "GET":
        return {
            "statusCode": 200,
            "headers": {**cors, "Content-Type": "application/json"},
            "body": json.dumps({"voices": VOICES}),
        }

    # Синтез речи
    if event.get("httpMethod") == "POST":
        api_key = os.environ.get("YANDEX_API_KEY", "")
        if not api_key:
            return {"statusCode": 500, "headers": cors, "body": json.dumps({"error": "YANDEX_API_KEY не задан"})}

        body = json.loads(event.get("body") or "{}")
        text = (body.get("text") or "").strip()
        voice = body.get("voice", "alena")
        speed = float(body.get("speed", 1.0))
        emotion = body.get("emotion", "neutral")

        if not text:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Пустой текст"})}

        # Обрезаем до лимита SpeechKit
        text = text[:MAX_CHARS]

        params = {
            "text": text,
            "lang": "ru-RU",
            "voice": voice,
            "emotion": emotion,
            "speed": str(round(speed, 2)),
            "format": "mp3",
            "sampleRateHertz": "48000",
        }

        resp = requests.post(
            TTS_URL,
            data=params,
            headers={"Authorization": f"Api-Key {api_key}"},
            timeout=30,
        )

        if resp.status_code != 200:
            return {
                "statusCode": resp.status_code,
                "headers": cors,
                "body": json.dumps({"error": resp.text}),
            }

        audio_b64 = base64.b64encode(resp.content).decode("utf-8")
        return {
            "statusCode": 200,
            "headers": {**cors, "Content-Type": "application/json"},
            "body": json.dumps({"audio": audio_b64, "format": "mp3"}),
        }

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "Method not allowed"})}
