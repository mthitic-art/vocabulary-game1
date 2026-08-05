# -*- coding: utf-8 -*-
"""
emoji_map.py — คลัง emoji สำรองสำหรับคำที่ยังไม่มีรูปภาพ

ใช้ร่วมกันโดย excel_to_json.py (ตอนสร้าง JSON รายเดือน) และ
fix_vocabulary.py (ตอนซ่อม JSON ที่มีอยู่แล้ว)

หลักการ:
  1. ถ้ามีไฟล์ภาพจริง → ใช้ภาพ (emoji เป็นแค่ตัวสำรอง)
  2. ถ้าไม่มีภาพ แต่มี emoji → เกมแสดง emoji
  3. ถ้าไม่มีทั้งคู่ → เกมจะสลับไปใช้ "โหมดการ์ดคำ" (แสดงตัวหนังสือ)
     ซึ่งยังเล่นได้ปกติ ไม่ขึ้นเครื่องหมาย "?" อีกต่อไป

คำนามธรรม (abstract) เช่น academic, taxonomy, opinion จงใจไม่ใส่ emoji
เพราะไม่มี emoji ตัวไหนสื่อความหมายได้ตรง — ปล่อยให้ใช้โหมดการ์ดคำดีกว่า
"""

EMOJI_MAP = {
    # ── คน / อาชีพ ──────────────────────────────────────────────
    "accountant": "🧮", "architect": "📐", "athlete": "🏃", "audience": "👥",
    "baby": "👶", "bride": "👰", "builder": "👷", "child": "🧒", "children": "🧒",
    "coach": "🧑‍🏫", "coder": "🧑‍💻", "consultant": "💼", "cook": "👨‍🍳",
    "donor": "🎁", "electrician": "🔌", "emperor": "🤴", "expert": "🎓",
    "farmer": "👨‍🌾", "father": "👨", "firefighter": "👨‍🚒",
    "flight attendant": "🧑‍✈️", "air steward": "🧑‍✈️", "giant": "🗿",
    "grandfather": "👴", "grandmother": "👵", "guard": "💂", "hairdresser": "💇",
    "human": "🧍", "king": "🤴", "knight": "🛡️", "leader": "🧑‍💼",
    "librarian": "📚", "lifeguard": "🛟", "market seller": "🧑‍🌾",
    "mechanic": "🔧", "mother": "👩", "nurse": "👩‍⚕️", "paramedic": "🚑",
    "parent": "👨‍👩‍👧", "parents": "👨‍👩‍👧", "partner": "🤝",
    "people": "👨‍👩‍👧‍👦", "person": "🧍", "physiotherapist": "🧑‍⚕️",
    "pilot": "🧑‍✈️", "poet": "✍️", "police officer": "👮", "politician": "🏛️",
    "principal": "🧑‍🏫", "professor": "👨‍🏫", "programmer": "🧑‍💻",
    "psychologist": "🧠", "queen": "👸", "rescuer": "🦺", "rice grower": "🌾",
    "sailor": "⛵", "scientist": "🔬", "spy": "🕵️", "student": "🧑‍🎓",
    "superhero": "🦸", "thief": "🥷", "veterinarian": "🐶", "visitor": "🧳",
    "volunteer": "🙋", "speaker": "🗣️", "champion": "🏆", "army": "🎖️",
    "colossus": "🗿", "cyclope": "👁️", "titans": "⚡", "greek god": "🏛️",
    "bishop": "♗", "pawn": "♟️", "rook": "♜", "stallion": "🐴", "puppet": "🎭",

    # ── ร่างกาย / สุขภาพ ────────────────────────────────────────
    "bandage": "🩹", "blood": "🩸", "bone": "🦴", "brain": "🧠", "chin": "😀",
    "claw": "🐾", "feet": "🦶", "fang": "🦷", "fin": "🐟", "fur": "🧸",
    "gill": "🐟", "heartbeat": "💓", "injury": "🤕", "knee": "🦵", "lung": "🫁",
    "medicine": "💊", "muscle": "💪", "palm": "🤚", "paw": "🐾", "skeleton": "💀",
    "skin": "🧴", "spine": "🦴", "stomach": "🫃", "teeth": "🦷", "tongue": "👅",
    "tooth": "🦷", "thumb": "👍", "tail": "🐕", "horn": "🐂", "beak": "🐦",
    "antenna": "📡", "germ": "🦠", "health": "❤️‍🩹", "healthy": "🥗",
    "ill": "🤒", "sick": "🤒", "sore": "🤕", "first aid": "🩹", "x-ray": "🩻",
    "medical emergency": "🚨", "microscope": "🔬", "hospitality": "🏨",

    # ── สัตว์ ───────────────────────────────────────────────────
    "ant": "🐜", "amphibian": "🐸", "bear": "🐻", "beetle": "🪲",
    "butterflies": "🦋", "cow": "🐄", "crab": "🦀", "centipede": "🐛",
    "chick": "🐤", "chicken": "🐔", "dinosaur": "🦕", "dragon": "🐉",
    "duck pond": "🦆", "eagle": "🦅", "flamingo": "🦩", "hen": "🐔",
    "horse": "🐴", "iguana": "🦎", "ladybird": "🐞", "ladybug": "🐞",
    "lobster": "🦞", "mammal": "🐘", "owl": "🦉", "reptile": "🦎",
    "seahorse": "🐠", "seal": "🦭", "shrimp": "🦐", "snail": "🐌",
    "squid": "🦑", "turtle": "🐢", "whale": "🐋", "yak": "🐃",
    "invertebrates": "🐙", "vertebrates": "🐟", "colony": "🐜",
    "tentacle": "🐙", "nest": "🪹", "hatch": "🐣", "wing": "🪽",
    "leash": "🦮", "pet": "🐶", "shell": "🐚", "zoology": "🦁",

    # ── อาหาร / เครื่องดื่ม ────────────────────────────────────
    "apples": "🍎", "avocado": "🥑", "bake": "🧁", "banquet": "🍽️",
    "breakfast": "🍳", "cabbage": "🥬", "carbohydrate": "🍞",
    "carrot soup": "🥕", "cheese": "🧀", "cherry": "🍒", "chilli pepper": "🌶️",
    "chips": "🍟", "coconut": "🥥", "coriander": "🌿", "cranberry": "🫐",
    "cucumber": "🥒", "dairy": "🥛", "dessert": "🍰", "dinner": "🍽️",
    "dish": "🍽️", "donut": "🍩", "dough": "🥟", "durian": "🥭",
    "fig": "🍈", "filling": "🥧", "flour": "🌾", "food festival": "🎪",
    "fruit salad": "🥗", "golden brown": "🥐", "grape": "🍇",
    "green bean": "🫛", "hamburger": "🍔", "kiwi": "🥝", "leek": "🥬",
    "lemon": "🍋", "loaf": "🍞", "lunch": "🍱", "main course": "🍛",
    "mango": "🥭", "menu": "📋", "milk": "🥛", "okra": "🫑", "onion": "🧅",
    "pancake": "🥞", "pie": "🥧", "plantain": "🍌", "plate": "🍽️",
    "platter": "🍱", "porridge": "🥣", "potato": "🥔", "protein": "🍗",
    "pudding": "🍮", "pumpkin": "🎃", "radish": "🥕", "recipe": "📖",
    "rice": "🍚", "rice bun": "🍙", "roast": "🍖", "roast turkey": "🦃",
    "salad": "🥗", "salt": "🧂", "salty": "🧂", "savoury": "🍲",
    "seed": "🌱", "seeds": "🌱", "smoothie": "🥤", "sour": "🍋",
    "spice": "🌶️", "starter": "🥗", "street food": "🍢", "sweet": "🍬",
    "sweet treat": "🍭", "tea": "🍵", "tofu": "🧊", "topping": "🍒",
    "tray": "🍽️", "vegetable": "🥦", "vegetarian": "🥗",
    "watermelon": "🍉", "wheat": "🌾", "whisk": "🥄", "spatula": "🍳",
    "tablespoon": "🥄", "kettle": "🫖", "pot": "🍲", "scoop": "🍨",
    "stir": "🥄", "pour": "🫗", "peel": "🍌", "chew": "😋", "sip": "🥤",
    "taste": "👅", "bitter": "😖", "feed": "🍼", "eat": "🍽️",
    "poppyseed": "🌰", "beans": "🫘", "sprout": "🌱", "salve": "🧴",

    # ── บ้าน / สิ่งของ ─────────────────────────────────────────
    "backyard": "🏡", "bath": "🛁", "battery": "🔋", "bottle": "🍼",
    "broom": "🧹", "brick": "🧱", "bunk": "🛏️", "button": "🔘",
    "cabin": "🛖", "cage": "🪤", "calculator": "🧮", "camera": "📷",
    "can": "🥫", "castle": "🏰", "chimney": "🏠", "cloth": "🧵",
    "colored pencils": "🖍️", "cottage": "🏡", "couch": "🛋️",
    "cushion": "🛋️", "dart board": "🎯", "dice": "🎲", "doorstep": "🚪",
    "dolls": "🪆", "dress": "👗", "egg tray": "🥚", "fire": "🔥",
    "flag": "🚩", "fountain": "⛲", "gate": "🚪", "glue": "🩹",
    "hanger": "🧥", "hose": "🚿", "home": "🏠", "jumper": "🧥",
    "key": "🔑", "laundry": "🧺", "magnifying glass": "🔍",
    "mobile phone": "📱", "notebook": "📓", "paper clip": "📎",
    "phone": "📱", "pile": "📚", "pillar": "🏛️", "playroom": "🧸",
    "rag": "🧻", "ring": "💍", "robot": "🤖", "roof": "🏠",
    "rooftop": "🏙️", "room": "🚪", "scissors": "✂️", "shoelace": "👟",
    "shoes": "👟", "shovel": "🪏", "shower": "🚿", "sleeping bag": "🛌",
    "soap": "🧼", "sponge": "🧽", "stair": "🪜", "straw": "🥤",
    "sword": "⚔️", "television": "📺", "tin": "🥫", "toy": "🧸",
    "trash": "🗑️", "rubbish": "🗑️", "litter": "🗑️", "vase": "🏺",
    "wall": "🧱", "washing machine": "🧺", "window": "🪟",
    "sandal": "🩴", "trunks": "🩳", "helmet": "⛑️", "shield": "🛡️",
    "crown": "👑", "sew": "🪡", "tie": "👔", "switch": "🔌", "remote": "📱",

    # ── สถานที่ ─────────────────────────────────────────────────
    "academy": "🏫", "aquarium tunnel": "🐠", "arcade": "🕹️",
    "campus": "🏫", "cave": "🕳️", "cave home": "🕳️",
    "climbing centre": "🧗", "climbing wall": "🧗", "creek": "🏞️",
    "desert": "🏜️", "dune": "🏜️", "entrance": "🚪", "field": "🌾",
    "floating home": "🏠", "floating market": "🛶", "gym": "🏋️",
    "gymnasium": "🏋️", "harbour": "⚓", "home on stilts": "🏚️",
    "island": "🏝️", "jail": "🔒", "jungle": "🌴", "laboratory": "🔬",
    "lighthouse": "🗼", "main hall": "🏛️", "mall": "🏬",
    "market": "🏪", "market stall": "🏪", "mausoleum": "🏛️",
    "maze": "🌀", "monument": "🗿", "mountain": "⛰️", "museum": "🏛️",
    "pagoda": "🏯", "palace": "🏰", "quay": "⚓", "river": "🏞️",
    "riverbank": "🏞️", "science museum": "🔬", "skateboard park": "🛹",
    "skating rink": "⛸️", "souk": "🏪", "sport field": "🏟️",
    "sports field": "🏟️", "temple": "🛕", "theatre": "🎭",
    "theme park": "🎢", "ticket office": "🎫", "tunnel": "🚇",
    "valley": "🏞️", "village": "🏘️", "volleyball court": "🏐",
    "water park": "🏊", "waterfall": "🏞️", "yoga studio": "🧘",
    "way in": "➡️", "way out": "🚪", "world": "🌍", "country": "🗺️",
    "globe": "🌍", "state": "🗺️", "place": "📍", "location": "📍",
    "burial mound": "⛰️", "chamber": "🚪",

    # ── ยานพาหนะ / อวกาศ ───────────────────────────────────────
    "bicycle": "🚲", "helicopter": "🚁", "rocket": "🚀", "rowing boat": "🚣",
    "ship": "🚢", "ship-wrecked": "🚢", "skateboard": "🛹", "taxi": "🚕",
    "transport": "🚌", "traffic": "🚦", "van": "🚐", "orbit": "🪐",
    "planet": "🪐", "solar system": "🪐", "space": "🌌",
    "space backpack": "🎒", "space badge": "🏅", "space boot": "👢",
    "space equipment": "🛠️", "space explorer": "👨‍🚀",
    "space glove": "🧤", "space hotel": "🏨", "space probe": "🛰️",
    "space radius": "🪐", "space rocket": "🚀", "space station": "🛰️",
    "spacesuits": "👨‍🚀", "spacewalk": "👨‍🚀",
    "lunar module": "🛸", "launch": "🚀", "telescope": "🔭",
    "crescent moon": "🌙", "full moon": "🌕", "flaming ball": "☄️",
    "sunlight": "☀️", "solar panel": "🔆", "satellite": "🛰️",
    "aviation": "✈️", "take off": "🛫", "check in": "🎫",
    "security scanner": "🛃", "departure": "🛫", "journey": "🧳",
    "travel": "🧳", "tourism": "🧳", "sightseeing": "📸", "holiday": "🏖️",

    # ── ธรรมชาติ / อากาศ ───────────────────────────────────────
    "air": "💨", "bloom": "🌸", "branch": "🌿", "cold weather": "🥶",
    "foggy": "🌫️", "fresh water": "💧", "ground": "🟫", "hail": "🌨️",
    "harvest": "🌾", "hot weather": "🥵", "lightning": "⚡",
    "misty": "🌫️", "nature": "🌿", "orchid": "🌸", "petal": "🌸",
    "reed": "🌾", "root": "🌱", "rose": "🌹", "salt water": "🌊",
    "season": "🍂", "seaweed": "🌿", "soil": "🟫", "stem": "🌱",
    "stormy": "⛈️", "summer": "☀️", "sunflower": "🌻", "thunder": "⛈️",
    "thunderbolt": "⚡", "trunk": "🌳", "trees": "🌳", "underwater": "🌊",
    "weather": "🌦️", "wood": "🪵", "log": "🪵", "squall": "🌪️",
    "agriculture": "🌾", "energy": "⚡", "electricity": "⚡",
    "gas": "💨", "turbine": "🌬️", "generator": "⚙️", "machine": "⚙️",

    # ── กีฬา / กิจกรรม ─────────────────────────────────────────
    "balance": "⚖️", "bounce": "⛹️", "cartwheel": "🤸", "chess": "♟️",
    "football": "⚽", "foot ball": "⚽", "hockey": "🏒", "hoop": "🏀",
    "hop": "🦘", "hurdle race": "🏃", "javelin throw": "🥇",
    "long jump": "🤸", "marble": "🔮", "net": "🥅", "racket": "🎾",
    "sack race": "🏃", "score": "🎯", "skate": "⛸️", "sport": "🏅",
    "surf": "🏄", "tennis": "🎾", "throw": "🤾", "win": "🏆",
    "yawn": "🥱", "nap": "😴", "sleep": "😴", "relax": "🧘",
    "hike": "🥾", "camp": "🏕️", "picnic": "🧺", "dig": "🪏",
    "climb": "🧗", "crawl": "🧎", "stretch": "🤸", "stand": "🧍",
    "stand up": "🧍", "crouch": "🧎", "lean": "🚶", "carry": "🧳",
    "push": "🫸", "hold": "✊", "hang": "🪝", "lift": "🏋️",
    "leap": "🦘", "float": "🏊", "drive": "🚗", "row": "🚣",
    "certificate": "📜", "training": "🏋️", "practice": "📝",

    # ── โรงเรียน / เรียนรู้ ────────────────────────────────────
    "art": "🎨", "book cover": "📕", "books": "📚", "chart": "📊",
    "diary": "📔", "diary entry": "📔", "education": "🎓", "english": "🔤",
    "graph": "📈", "grid": "🔲", "handwriting": "✍️", "homework": "📝",
    "label": "🏷️", "list": "📋", "magazine": "📰", "math": "➗",
    "number": "🔢", "numbers": "🔢", "numeral": "🔢", "pictogram": "📊",
    "pie chart": "🥧", "poem": "📜", "presentation": "📊",
    "question": "❓", "read": "📖", "report": "📄", "rhyme": "🎵",
    "rule": "📏", "science": "🔬", "story": "📖", "strip book": "📓",
    "study": "📚", "test": "📝", "verse": "📜", "words": "🔤",
    "write": "✍️", "sketch": "✏️", "scan": "📠", "code": "💻",
    "website": "🌐", "blog": "📝", "data": "📊", "password": "🔑",
    "technology": "💻", "measure": "📏", "centimeter": "📏",
    "quarter": "🕒", "hour": "🕐", "time": "⏰", "year": "📅",
    "add": "➕", "addition": "➕", "minus": "➖", "plus": "➕",
    "subtraction": "➖", "sum": "🧮", "equal": "🟰", "not equal": "≠",
    "percentage": "％", "cube": "🧊", "cuboid": "📦", "cone": "🍦",
    "cylinder": "🥫", "sphere": "🔵", "pyramid": "🔺",
    "quadrilateral": "🔷", "curve": "〰️", "curved": "〰️",
    "curved line": "〰️", "straight line": "➖", "horizontal line": "➖",
    "vertical line": "❕", "diagonal line": "↗️", "vertex": "📐",
    "column": "🏛️", "section": "📑", "part": "🧩", "whole": "⭕",
    "number puzzle": "🧩", "word puzzle": "🧩", "picture puzzle": "🧩",

    # ── ตัวเลขลำดับ ────────────────────────────────────────────
    "third": "3️⃣", "fourth": "4️⃣", "fifth": "5️⃣", "sixth": "6️⃣",
    "seventh": "7️⃣", "eighth": "8️⃣", "ninth": "9️⃣", "tenth": "🔟",
    "thirty": "3️⃣0️⃣", "forty": "4️⃣0️⃣", "fifty": "5️⃣0️⃣",
    "sixty": "6️⃣0️⃣", "seventy": "7️⃣0️⃣", "eighty": "8️⃣0️⃣",
    "ninety": "9️⃣0️⃣", "hundred": "💯",

    # ── ความรู้สึก ─────────────────────────────────────────────
    "afraid": "😨", "angry": "😠", "bored": "😑", "brave": "🦁",
    "comfortable": "😌", "curious": "🤔", "disappoint": "😞",
    "enjoy": "😄", "frighten": "😱", "gasp": "😮", "hope": "🤞",
    "love": "❤️", "lucky": "🍀", "nervous": "😰", "peace": "☮️",
    "proud": "😌", "respect": "🙏", "scared": "😨", "shocked": "😲",
    "stress": "😩", "surprise": "😲", "upset": "😢", "worried": "😟",
    "wonder": "🤔", "kindness": "💝", "courage": "🦁", "charity": "💝",
    "trouble": "⚠️", "danger": "⚠️", "urgent": "🚨", "safe": "🦺",
    "care": "💗", "careful": "⚠️", "promise": "🤝", "argue": "😤",
    "argument": "💬", "conversation": "💬", "war": "⚔️", "rebellion": "✊",

    # ── การกระทำทั่วไป ─────────────────────────────────────────
    "bang": "💥", "bend": "🙇", "break": "💔", "cancel": "❌",
    "chase": "🏃", "check": "✅", "correct": "✅", "crack": "🥚",
    "cracked": "🪨", "cross out": "❌", "crush": "🪨", "cut": "✂️",
    "delete": "🗑️", "destroy": "💥", "disappear": "💨", "drop": "💧",
    "escape": "🏃", "fasten": "🔒", "fold": "📄", "give": "🎁",
    "hide": "🙈", "listen": "👂", "hear": "👂", "mix": "🥄",
    "observe": "👀", "pinch": "🤏", "protect": "🛡️", "pump": "⛽",
    "recoil": "↩️", "rescue": "🛟", "roar": "🦁", "sail": "⛵",
    "scratch": "✏️", "search": "🔍", "shine": "✨", "sort": "🗂️",
    "spin": "🌀", "squeak": "🐭", "squirt": "💦", "start": "▶️",
    "stay": "🛑", "survive": "💪", "swap": "🔄", "take away": "➖",
    "tear": "😢", "tick": "✔️", "touch": "👆", "turn": "🔄",
    "twinkle": "✨", "wash": "🧼", "put": "📥", "make": "🔨",
    "learn": "📚", "think": "🤔", "count on": "🔢", "count back": "🔢",
    "record": "⏺️", "display": "🖥️", "cover": "📕", "cycle": "🔁",
    "dye": "🎨", "coil": "🌀", "lash": "🌊", "lay": "🥚", "roll": "🎲",
    "improve": "📈", "overcome": "💪", "recommend": "👍", "retell": "🗣️",
    "remind": "⏰", "reminder": "⏰", "tidy": "🧹", "mess": "🌀",
    "neat": "✨", "grow": "🌱", "change": "🔄", "compare": "⚖️",
    "arrange": "🗂️", "manage": "📋", "perform": "🎭", "pretend": "🎭",
    "describe": "💬", "decode": "🔓", "locate": "📍", "represent": "🪧",
    "relate": "🔗", "invest": "💰", "post": "📮", "queue": "🚶",
    "order": "🔢", "select": "☑️", "speedy": "💨",

    # ── สิ่งของ / นามธรรมที่พอสื่อได้ ───────────────────────────
    "adventure": "🗺️", "accident": "💥", "action": "🎬", "animation": "🎬",
    "audio book": "🎧", "autograph": "✍️", "background": "🖼️",
    "bond": "🔗", "business": "💼", "calypso": "🎶", "caption": "💬",
    "character": "🎭", "characters": "🎭", "chore": "🧹", "club": "🎪",
    "collection": "📦", "command": "🗣️", "construction": "🏗️",
    "crane": "🏗️", "disco": "🪩", "drama": "🎭", "dream": "💭",
    "duty": "📋", "event": "📅", "evidence": "🔍", "feast": "🍗",
    "feedback": "💬", "festival": "🎉", "film": "🎬", "finance": "💰",
    "fundraiser": "💝", "game changer": "🔄", "government": "🏛️",
    "guitar": "🎸", "flute": "🪈", "idiom": "💬", "illusion": "🪄",
    "information": "ℹ️", "ingredient": "🥣", "instruction": "📋",
    "jive": "💃", "knowledge": "🧠", "law": "⚖️", "logo": "🏷️",
    "media drama": "🎬", "memory": "🧠", "mission": "🎯", "money": "💰",
    "monster": "👾", "motto": "📜", "music": "🎵", "mystery": "🔮",
    "opportunity": "🚪", "organization": "🏢", "performance": "🎭",
    "photograph": "📷", "photos": "📷", "power": "⚡", "problem": "❗",
    "promotion": "📈", "prop": "🎬", "puppet show": "🎭",
    "qualification": "🎓", "recycler": "♻️", "reflection": "🪞",
    "role": "🎭", "routine": "🔁", "salary": "💵", "service": "🛎️",
    "shade": "🌂", "shelter": "🏠", "skills": "🛠️", "solution": "💡",
    "success": "🏆", "suggestion": "💡", "symbol": "🔣", "talent": "🌟",
    "task": "📋", "technique": "🛠️", "theme": "🎨", "ticket": "🎫",
    "training ": "🏋️", "truth": "✅", "work": "💼", "seat": "💺",
    "coat of arms": "🛡️", "chariot": "🛞", "banquet ": "🍽️",
    "model houses": "🏘️", "stacked home": "🏢", "apartment": "🏢",

    # ── รอบเก็บตก (คำที่ยังไม่มีทั้งภาพและ emoji) ────────────────
    "application": "📱", "bad": "👎", "good": "👍", "bar": "📊",
    "block": "🧱", "body part": "🧍", "center": "🎯", "crease": "📄",
    "design": "🎨", "difficulty": "🧗", "element": "⚛️", "enormous": "🐘",
    "exercise": "🏃", "experience": "🎓", "feel": "🤲", "fierce": "🐯",
    "flow": "🌊", "fork of tree": "🌳", "hole": "🕳️", "imagination": "💭",
    "indoor": "🏠", "iron": "🧺", "knee-deep": "🦵", "land": "🏞️",
    "map": "🗺️", "meaning": "💬", "mud": "🟤", "opposite": "↔️",
    "outside": "🌳", "place value": "🔢", "professional": "💼",
    "quantifier": "🔢", "recognize": "👁️", "rest": "😴", "round": "⭕",
    "scale": "⚖️", "sharp": "🔪", "slope": "📐", "special": "🌟",
    "stroll": "🚶", "strong": "💪", "taxonomy": "🌳", "tragic": "😭",
    "young": "🐣",
    # ลำดับที่ 21-30 (ต้นฉบับ Excel มีเว้นวรรคเกินบ้าง จึงใส่ทั้งสองแบบ)
    "twenty-first": "2️⃣1️⃣", "twenty-second": "2️⃣2️⃣",
    "twenty-third": "2️⃣3️⃣", "twenty-fourth": "2️⃣4️⃣",
    "twenty- fifth": "2️⃣5️⃣", "twenty-fifth": "2️⃣5️⃣",
    "twenty-sixth": "2️⃣6️⃣", "twenty-seventh": "2️⃣7️⃣",
    "twenty- eight": "2️⃣8️⃣", "twenty-eighth": "2️⃣8️⃣",
    "twenty- ninth": "2️⃣9️⃣", "twenty-ninth": "2️⃣9️⃣",
    "thirtieth": "3️⃣0️⃣",
}


def emoji_for(word: str):
    """คืน emoji ที่เหมาะกับคำ หรือ None ถ้าไม่มีตัวไหนสื่อได้ตรง"""
    if not word:
        return None
    key = " ".join(str(word).strip().lower().split())
    if key in EMOJI_MAP:
        return EMOJI_MAP[key]
    # ลองตัดพหูพจน์ง่าย ๆ: apples → apple
    if key.endswith("s") and key[:-1] in EMOJI_MAP:
        return EMOJI_MAP[key[:-1]]
    if key.endswith("es") and key[:-2] in EMOJI_MAP:
        return EMOJI_MAP[key[:-2]]
    return None
