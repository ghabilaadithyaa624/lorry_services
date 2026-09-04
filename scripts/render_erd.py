#!/usr/bin/env python3
"""Render the LorryCarry database schema ERD as a PNG using Pillow only
(no network access required). Entity boxes are laid out in four columns;
all relationship lines are routed through a dedicated horizontal channel
strip above the boxes so they never cross through table contents.
"""
from PIL import Image, ImageDraw, ImageFont

FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
F_TITLE = ImageFont.truetype(FONT_DIR + "DejaVuSans-Bold.ttf", 30)
F_HEADER = ImageFont.truetype(FONT_DIR + "DejaVuSans-Bold.ttf", 16)
F_FIELD = ImageFont.truetype(FONT_DIR + "DejaVuSansMono.ttf", 13)
F_FIELD_TYPE = ImageFont.truetype(FONT_DIR + "DejaVuSansMono.ttf", 12)
F_LABEL = ImageFont.truetype(FONT_DIR + "DejaVuSans.ttf", 12)
F_SMALL = ImageFont.truetype(FONT_DIR + "DejaVuSans.ttf", 13)

BG = (7, 10, 17)
HEADER_BG = (234, 88, 12)
BOX_BG = (15, 23, 42)
BOX_BORDER = (71, 85, 105)
TEXT_WHITE = (241, 245, 249)
TEXT_MUTED = (148, 163, 184)
PK_COLOR = (250, 204, 21)
FK_COLOR = (56, 189, 248)
UQ_COLOR = (216, 180, 254)
LINE_COLOR = (100, 116, 139)
NEW_TEXT_COLOR = (74, 222, 128)
NEW_ROW_BG = (6, 46, 34)
TITLE_COLOR = (249, 115, 22)

CANVAS_W = 2820
CANVAS_H = 2050

img = Image.new("RGB", (CANVAS_W, CANVAS_H), BG)
d = ImageDraw.Draw(img)

d.text((40, 22), "LorryCarry — Database Schema ERD", font=F_TITLE, fill=TITLE_COLOR)
d.text((40, 62), "Users \u2192 Vehicles (Trucks) \u2192 Loads \u2192 Bookings \u2192 Payments \u2192 Notifications   |   Core relationship: FactoryOwner \u2192 Booking \u2192 TruckDriver",
       font=F_SMALL, fill=TEXT_MUTED)

# All relationship "highway" channels live between CHANNEL_TOP and BOX_TOP,
# each on its own y row so lines never overlap each other or box interiors.
CHANNEL_TOP = 100
BOX_TOP = 100 + 16 * 24  # room for up to ~16 channel rows
BOX_TOP = 500

boxes = {}


def draw_entity(name, x, y, w, title, fields, new_fields=None):
    new_fields = new_fields or set()
    row_h = 24
    header_h = 32
    h = header_h + row_h * len(fields) + 8
    d.rectangle([x + 4, y + 6, x + w + 4, y + h + 6], fill=(0, 0, 0))
    d.rectangle([x, y, x + w, y + h], fill=BOX_BG, outline=BOX_BORDER, width=2)
    d.rectangle([x, y, x + w, y + header_h], fill=HEADER_BG)
    d.text((x + 12, y + 6), title, font=F_HEADER, fill=(10, 10, 10))

    cy = y + header_h + 4
    for marker, fname, ftype in fields:
        if fname in new_fields:
            d.rectangle([x + 2, cy - 2, x + w - 2, cy + row_h - 4], fill=NEW_ROW_BG)
        mx = x + 10
        if marker == "PK":
            d.text((mx, cy), "PK", font=F_FIELD, fill=PK_COLOR)
        elif marker == "FK":
            d.text((mx, cy), "FK", font=F_FIELD, fill=FK_COLOR)
        elif marker == "UQ":
            d.text((mx, cy), "UQ", font=F_FIELD, fill=UQ_COLOR)
        name_x = x + 46
        color = NEW_TEXT_COLOR if fname in new_fields else TEXT_WHITE
        d.text((name_x, cy), fname, font=F_FIELD, fill=color)
        type_x = x + w - 10 - d.textlength(ftype, font=F_FIELD_TYPE)
        d.text((type_x, cy), ftype, font=F_FIELD_TYPE, fill=TEXT_MUTED)
        cy += row_h
    boxes[name] = (x, y, w, h)
    return h


def label_at(x, y, text, bg=BG, fg=(203, 213, 225), font=F_LABEL, anchor="la"):
    if anchor == "mm":
        tw = d.textlength(text, font=font)
        d.rectangle([x - tw / 2 - 4, y - 9, x + tw / 2 + 4, y + 9], fill=bg)
        d.text((x - tw / 2, y - 8), text, font=font, fill=fg)
    else:
        tw = d.textlength(text, font=font)
        d.rectangle([x - 3, y - 2, x + tw + 3, y + 16], fill=bg)
        d.text((x, y), text, font=font, fill=fg)


def channel_route(src_x, src_top_y, channel_y, dst_x, dst_y, label=None, color=LINE_COLOR):
    """Route: up/down from (src_x, src_top_y) to the shared channel_y, then
    horizontally to dst_x, then down/up into (dst_x, dst_y). Used for all
    connectors so nothing ever crosses through a box's interior — every
    horizontal run happens inside the empty channel strip above the boxes."""
    d.line([(src_x, src_top_y), (src_x, channel_y)], fill=color, width=2)
    d.line([(src_x, channel_y), (dst_x, channel_y)], fill=color, width=2)
    d.line([(dst_x, channel_y), (dst_x, dst_y)], fill=color, width=2)
    d.ellipse([dst_x - 3, dst_y - 3, dst_x + 3, dst_y + 3], fill=color)
    if label:
        label_at(min(src_x, dst_x) + abs(dst_x - src_x) / 2, channel_y - 17, label)


def vconnect(x, y1, y2, label=None, color=LINE_COLOR, label_side="right"):
    d.line([(x, y1), (x, y2)], fill=color, width=2)
    d.ellipse([x - 3, y2 - 3, x + 3, y2 + 3], fill=color)
    if label:
        lx = x + 10 if label_side == "right" else x - 10 - d.textlength(label, font=F_LABEL)
        label_at(lx, (y1 + y2) / 2 - 8, label)


# =========================== Column 1: Users ===========================
col1_x = 50
users_y = BOX_TOP
users_fields = [
    ("PK", "id", "uuid"),
    ("UQ", "phone", "string"),
    ("", "name", "string?"),
    ("", "role", "enum"),
    ("", "created_at", "datetime"),
    ("", "updated_at", "datetime"),
]
h_users = draw_entity("users", col1_x, users_y, 470,
                       "USERS   role: factory_owner | truck_driver | admin", users_fields)
note_y = users_y + h_users + 6
d.text((col1_x, note_y), "role RENAMED: load_owner \u2192 factory_owner, truck_owner \u2192 truck_driver",
       font=F_LABEL, fill=NEW_TEXT_COLOR)

pref_y = note_y + 32
pref_fields = [
    ("PK", "id", "uuid"),
    ("FK", "user_id", "uuid  (1:1 unique)"),
    ("", "theme/language/currency", "string"),
    ("", "notify_whatsapp/sms/push", "bool"),
    ("", "default_radius_km", "int"),
]
h_pref = draw_entity("prefs", col1_x, pref_y, 470, "USER_PREFERENCES", pref_fields)

recpt_y = pref_y + h_pref + 26
recpt_fields = [
    ("PK", "id", "uuid"), ("FK", "user_id", "uuid"),
    ("", "notification_key", "string"), ("", "read_at", "datetime"),
]
h_recpt = draw_entity("receipts", col1_x, recpt_y, 470, "NOTIFICATION_RECEIPTS", recpt_fields)

sub_y = recpt_y + h_recpt + 26
sub_fields = [
    ("PK", "id", "uuid"), ("FK", "user_id", "uuid"), ("", "plan", "string"),
    ("", "status", "enum"), ("", "started_at", "datetime"),
    ("", "expires_at", "datetime  \u2605 expiry gate"), ("", "auto_renew", "bool"),
    ("FK", "payment_id", "string?"),
]
h_sub = draw_entity("subscriptions", col1_x, sub_y, 470, "SUBSCRIPTIONS", sub_fields, new_fields={"auto_renew"})
vconnect(col1_x + 40, users_y + h_users, sub_y, "1:N per user", label_side="right")

# =========================== Column 2: Trucks / Documents / Loads ===========================
col2_x = 660
truck_y = BOX_TOP
truck_fields = [
    ("PK", "id", "uuid"), ("FK", "user_id", "uuid  (truck driver)"),
    ("UQ", "registration_number", "string"), ("", "body_type", "enum"),
    ("", "tonnage_capacity", "decimal"), ("", "current_location", "geography"),
    ("", "serviceable_radius_km", "int"), ("", "verification_status", "enum"),
    ("", "verified_at", "datetime?"),
]
h_truck = draw_entity("trucks", col2_x, truck_y, 540, "TRUCKS   (Vehicles)", truck_fields)

doc_y = truck_y + h_truck + 34
doc_fields = [
    ("PK", "id", "uuid"), ("FK", "truck_id", "uuid"), ("", "type", "enum  RC | Insurance"),
    ("", "doc_number", "string?"), ("", "s3_url / s3_key", "string"),
    ("", "verification_status", "enum"), ("", "is_verified", "bool"),
    ("", "verified_by", "string?"), ("", "verified_at", "datetime?"), ("", "expiry_date", "datetime?"),
]
h_doc = draw_entity("documents", col2_x, doc_y, 540, "DOCUMENTS   RC / Insurance Verification",
                     doc_fields, new_fields={"is_verified", "expiry_date"})
vconnect(col2_x + 60, truck_y + h_truck, doc_y, "1:N RC/Insurance")

load_y = doc_y + h_doc + 34
load_fields = [
    ("PK", "id", "uuid"), ("FK", "user_id", "uuid  (factory owner)"),
    ("", "tonnage_required", "decimal"), ("", "loading_address/pin", "string"),
    ("", "loading_point", "geography"), ("", "unloading_address/pin", "string"),
    ("", "unloading_point", "geography"), ("", "truck_type", "enum"), ("", "urgent", "bool"),
    ("", "max_price", "decimal?"), ("", "status", "enum"),
]
h_load = draw_entity("loads", col2_x, load_y, 540, "LOADS   (Freight)", load_fields)

# =========================== Column 3: Bookings / Checkpoints ===========================
col3_x = 1330
booking_y = BOX_TOP
booking_fields = [
    ("PK", "id", "uuid"), ("FK", "load_id", "uuid"), ("FK", "truck_id", "uuid"),
    ("FK", "factory_owner_id", "uuid  (load_owner_id)"),
    ("FK", "truck_driver_id", "uuid  (truck_owner_id)"),
    ("", "agreed_price", "decimal"), ("", "advance_confirmed", "bool"),
    ("", "balance_confirmed", "bool"), ("", "eway_bill_number", "string?"),
    ("", "liability_accepted", "bool"), ("", "status", "enum"),
    ("", "whatsapp_trigger_status", "enum"), ("", "whatsapp_triggered_at", "datetime?"),
    ("", "started_at/completed_at", "datetime?"),
]
h_booking = draw_entity("bookings", col3_x, booking_y, 560,
                         "BOOKINGS   FactoryOwner \u2192 Booking \u2192 TruckDriver",
                         booking_fields, new_fields={"whatsapp_trigger_status", "whatsapp_triggered_at"})

checkpoint_y = booking_y + h_booking + 34
checkpoint_fields = [
    ("PK", "id", "uuid"), ("FK", "booking_id", "uuid"), ("", "seq", "int (1..5)"),
    ("", "name", "string"), ("", "location", "geography"), ("", "radius_m", "int"),
    ("", "crossed_at", "datetime?"), ("", "eta_minutes", "int?"), ("", "notified_at", "datetime?"),
]
h_checkpoint = draw_entity("checkpoints", col3_x, checkpoint_y, 560,
                            "CHECKPOINTS   5-stage trip tracking", checkpoint_fields)
vconnect(col3_x + 90, booking_y + h_booking, checkpoint_y, "1:N tracked via")

# =========================== Column 4: Payments / Notifications ===========================
col4_x = 2130
payment_y = BOX_TOP
payment_fields = [
    ("PK", "id", "uuid"), ("FK", "user_id", "uuid"), ("", "amount/currency", "decimal/string"),
    ("", "purpose", "enum"), ("", "status", "enum"), ("", "provider_order_id", "string?"),
    ("", "provider_txn_id", "string?"), ("", "paid_at", "datetime?"),
]
h_payment = draw_entity("payments", col4_x, payment_y, 620, "PAYMENTS", payment_fields)

notif_y = payment_y + h_payment + 34
notif_fields = [
    ("PK", "id", "uuid"), ("FK", "user_id", "uuid"), ("", "channel", "enum whatsapp/sms/push"),
    ("", "template/recipient", "string"), ("", "status", "enum"),
    ("", "provider_msg_id", "string?"), ("", "delivered_at/failed_at", "datetime?"),
]
h_notif = draw_entity("notifications", col4_x, notif_y, 620,
                       "NOTIFICATIONS   WhatsApp / SMS / Push", notif_fields)

# =========================== Relationship channels ===========================
ux, uy, uw, uh = boxes["users"]
tx, ty, tw_, th_ = boxes["trucks"]
lx, ly, lw_, lh_ = boxes["loads"]
bx, by, bw_, bh_ = boxes["bookings"]
px, py, pw_, ph_ = boxes["payments"]
nx, ny, nw_, nh_ = boxes["notifications"]

# Row of channel y-values, spaced 20px apart, all strictly above BOX_TOP
ch = list(range(CHANNEL_TOP, BOX_TOP - 20, 20))

channel_route(ux + 90, uy, ch[0], tx + 90, ty, "1:N users \u2192 trucks (drives)")
channel_route(ux + 150, uy, ch[1], lx + 90, ly, "1:N users \u2192 loads (posts)")
channel_route(ux + 210, uy, ch[2], bx + 130, by, "1:N users \u2192 bookings.factory_owner_id")
channel_route(ux + 270, uy, ch[3], bx + 190, by, "1:N users \u2192 bookings.truck_driver_id")
channel_route(ux + 330, uy, ch[4], px + 90, py, "1:N users \u2192 payments (makes)")
channel_route(ux + 390, uy, ch[5], nx + 90, ny, "1:N users \u2192 notifications (receives)")
channel_route(lx + 460, ly, ch[6], bx + 60, by, "1:N loads \u2192 bookings (fulfilled by)")
channel_route(tx + 460, ty, ch[7], bx + 90, by, "1:N trucks \u2192 bookings (assigned)")
channel_route(bx + 500, by, ch[8], nx + 150, ny, "bookings \u2192 notifications (WhatsApp trigger via Gupshup)")

# =========================== Legend ===========================
legend_y = CANVAS_H - 150
d.rectangle([50, legend_y, 1020, legend_y + 116], outline=BOX_BORDER, width=1)
d.text((66, legend_y + 8), "Legend", font=F_HEADER, fill=TEXT_WHITE)
d.text((66, legend_y + 36), "PK", font=F_FIELD, fill=PK_COLOR)
d.text((100, legend_y + 36), "Primary Key", font=F_SMALL, fill=TEXT_MUTED)
d.text((260, legend_y + 36), "FK", font=F_FIELD, fill=FK_COLOR)
d.text((294, legend_y + 36), "Foreign Key", font=F_SMALL, fill=TEXT_MUTED)
d.text((460, legend_y + 36), "UQ", font=F_FIELD, fill=UQ_COLOR)
d.text((494, legend_y + 36), "Unique constraint", font=F_SMALL, fill=TEXT_MUTED)
d.rectangle([66, legend_y + 60, 84, legend_y + 78], fill=NEW_ROW_BG)
d.text((90, legend_y + 62), "= field/column added by this migration (RC verification, WhatsApp trigger, subscription auto-renew)",
       font=F_SMALL, fill=NEW_TEXT_COLOR)
d.text((66, legend_y + 88), "Core commercial relationship:  FactoryOwner (was load_owner)  \u2192  Booking  \u2192  TruckDriver (was truck_owner)",
       font=F_SMALL, fill=(203, 213, 225))

img.save("docs/database-schema-erd.png")
print("Saved docs/database-schema-erd.png", img.size)
