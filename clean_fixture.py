import json
# Input and output file paths
INPUT_FILE = "databackup_till_28_sep_2025.json"
OUTPUT_FILE = "databackup_cleaned.json"

# Models we want to exclude from the fixture
EXCLUDE_MODELS = {
    "contenttypes.contenttype",
    "auth.permission",  # optional, remove if you want to keep permissions
}

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Filter out unwanted models
    cleaned = [obj for obj in data if obj["model"] not in EXCLUDE_MODELS]

    print(f"Original entries: {len(data)}")
    print(f"Cleaned entries: {len(cleaned)}")
    print(f"Removed entries: {len(data) - len(cleaned)}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2)

    print(f"Cleaned fixture saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
