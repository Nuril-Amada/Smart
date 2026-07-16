import pandas as pd

def normalize_code(value):

    if pd.isna(value):
        return ""

    value = str(value).strip()

    if value.lower() in ("nan", "none", ""):
        return ""

    value = value.replace("'", "")

    try:
        number = float(value)

        if number.is_integer():
            value = str(int(number))

    except:
        pass

    return value.strip()