import re

file_path = "backend/app/services/core_services.py"
with open(file_path, "r") as f:
    content = f.read()

# Imports
content = content.replace("primary_sport_code,\n    primary_sport_label,", "discipline_codes,\n    discipline_labels,")
content = content.replace("resolve_sport_item_id", "resolve_sport_item_ids")

# Need to ensure AthleteDiscipline is imported
content = content.replace("from app.models.entities import (", "from app.models.entities import (\n    AthleteDiscipline,")

# user register upgrade
old_register = """            sport_item_id = await resolve_sport_item_ids(self.session, dto.discipline_codes)
            athlete = AthleteProfile(
                user_id=user.id,
                handle=dto.handle,
                primary_sport_item_id=sport_item_id,
            )"""
# Wait, I didn't change dto fields yet in this file content string, let's just do regex or replace.

