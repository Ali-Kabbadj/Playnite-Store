import os
import time
import subprocess
from datetime import datetime

def backup_db():
    print("🛡️ Starting Database Backup Pipeline...")
    
    # Create backups directory if it doesn't exist
    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backups'))
    os.makedirs(backup_dir, exist_ok=True)
    
    # Generate timestamped filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = os.path.join(backup_dir, f"playnitedb_{timestamp}.dump")
    
    print(f"📦 Dumping database to: {filename}")
    
    # Command to run pg_dump (PostgreSQL's built-in backup tool)
    cmd = [
        "pg_dump",
        "-U", "postgres",
        "-d", "playnitedb",
        "-F", "c", # Custom format (compressed, easiest to restore)
        "-f", filename
    ]
    
    # Pass password via environment variable so it doesn't prompt
    env = os.environ.copy()
    env["PGPASSWORD"] = "3248"
    
    start_time = time.time()
    try:
        subprocess.run(cmd, env=env, check=True)
        print(f"\n✅ Backup completed successfully in {round(time.time() - start_time, 2)} seconds!")
        print(f"📁 Saved at: {filename}")
        print(f"💡 To restore this backup later, run:")
        print(f"   pg_restore -U postgres -d playnitedb -1 {filename}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Backup failed: {e}")
    except FileNotFoundError:
        print("\n❌ Error: 'pg_dump' is not installed or not in your system PATH.")

if __name__ == "__main__":
    backup_db()