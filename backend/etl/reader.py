import pandas as pd

def read_excel(file_path):
    try:
        df = pd.read_excel(file_path)
        return df
    except Exception as e:
        print("Error reading file:", e)
        return None