import os
import json
import concurrent.futures
from collections import defaultdict

SAMPLE_SIZE = 50000

def extract_paths(data, prefix=""):
    """Recursively extracts all property paths and their data types from a JSON object."""
    paths = set()
    if isinstance(data, dict):
        for k, v in data.items():
            new_prefix = f"{prefix}.{k}" if prefix else k
            type_name = type(v).__name__
            if v is None:
                type_name = "null"
                
            paths.add((new_prefix, type_name))
            paths.update(extract_paths(v, new_prefix))
            
    elif isinstance(data, list):
        for item in data:
            type_name = type(item).__name__
            if item is None:
                type_name = "null"
                
            paths.add((f"{prefix}[]", type_name))
            
            # If the list contains objects or other lists, recurse into them
            if isinstance(item, (dict, list)):
                paths.update(extract_paths(item, f"{prefix}[]"))
    return paths

def process_file(filepath):
    """Reads a single JSON file and extracts its schema paths."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return extract_paths(data)
    except Exception:
        return set()

def process_folder(folder_path):
    """Processes a batch of files in a folder using parallel processing."""
    folder_name = os.path.basename(folder_path)
    print(f"Scanning folder: {folder_name} ...")
    
    files = [f for f in os.listdir(folder_path) if f.endswith('.json') and f not in ('all.json', 'stats.json')]
    
    files = [f for f in files if len(f) > 7 or f[:-5].isdigit()]
    
    files = files[:SAMPLE_SIZE]
    
    if not files:
        print(f"  -> No valid individual JSON files found in {folder_name}. Skipping.")
        return None

    filepaths = [os.path.join(folder_path, f) for f in files]
    all_paths = set()
    
    with concurrent.futures.ProcessPoolExecutor() as executor:
        for result_set in executor.map(process_file, filepaths, chunksize=100):
            all_paths.update(result_set)
            
    schema_summary = defaultdict(set)
    for path, type_name in all_paths:
        schema_summary[path].add(type_name)
        
    return folder_name, len(files), schema_summary

def main():
    base_dir = "." # Current directory (GameDB)
    report_file = "gamedb_schema_report.txt"
    
    folders_to_scan = [os.path.join(base_dir, entry) for entry in os.listdir(base_dir) 
                       if os.path.isdir(os.path.join(base_dir, entry)) and not entry.startswith('.')]
            
    print(f"Found {len(folders_to_scan)} folders. Starting mass schema analysis in parallel...")
    
    with open(report_file, 'w', encoding='utf-8') as report:
        for folder_path in sorted(folders_to_scan):
            result = process_folder(folder_path)
            if result:
                folder_name, scanned_count, schema_summary = result
                report.write(f"====================================\n")
                report.write(f"TABLE/FOLDER: {folder_name.upper()} (Scanned {scanned_count} files)\n")
                report.write(f"====================================\n")
                
                # Sort paths alphabetically so it's easy to read
                for path in sorted(schema_summary.keys()):
                    types = ", ".join(sorted(schema_summary[path]))
                    report.write(f"{path} : {types}\n")
                    
                report.write("\n\n")
                print(f"  -> Finished {folder_name} (Found {len(schema_summary)} unique structural paths)")
                
    print(f"\n✅ Analysis complete! Report saved to '{report_file}'.")

if __name__ == "__main__":
    main()